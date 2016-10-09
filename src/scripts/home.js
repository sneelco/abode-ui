var home = angular.module('abode.home', []);

home.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('main.home', {
      url: '/Home/:interface',
      template: '<interface class="interface"></interface>',
      controller: 'homeController',
      resolve: {
        'interface': function ($stateParams, abode) {
          abode.config.interface = $stateParams.interface || abode.config.interface;
          abode.save();
        }
      }
    });

}]);

home.factory('Interfaces', ['$resource', '$http', '$q', 'abode', function($resource, $http, $q, abode) {

  var interfaces = $resource(abode.url('/api/interfaces/:id'),{
    'id': '@_id'
  },{
    'update': {'method': 'PUT'},
  });

  interfaces.template = function (name) {
    var defer = $q.defer();

    $http.get(abode.url('/api/interfaces/' + name + '/template').value()).then(function (result) {
      defer.resolve(result.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  return interfaces;
}]);

home.directive('interface', ['$sce', 'abode', function ($sce, abode) {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      'view': '@'
    },
    templateUrl: function ($scope) {
      //return $sce.trustAsResourceUrl(abode.url('/api/abode/views/home.html').value());
      return $sce.trustAsResourceUrl(abode.url('/api/interfaces/' + abode.config.interface + '/template').value());
    }
  };
}]);

home.directive('interfaceList', function () {  return {
    restrict: 'E',
    replace: true,
    scope: {
      'show': '@'
    },
    templateUrl: 'views/home/interfaceList.html',
    controller: ['$scope', 'Interfaces', function ($scope, Interfaces) {
      $scope.interfaces = [];

      Interfaces.query().$promise.then(function (results) {
        if (!$scope.show) {
          $scope.interfaces = results;
        } else {
          ifaces = $scope.show.split(',');
          ifaces.forEach(function (show) {
            match = results.filter(function (iface) { return show === iface.name});
            if (match.length !== 0) {
              $scope.interfaces.push(match[0]);
            }
          });
        }

      });


    }]
  };
});

home.directive('interfaceLink', function () {  return {
    restrict: 'E',
    replace: true,
    scope: {
      'interface': '='
    },
    templateUrl: 'views/home/interfaceLink.html',
  };
});

home.controller('homeController', ['$scope', '$state', '$templateCache', 'abode', function ($scope, $state, $templateCache, abode, Interfaces) {
  $scope.interface = $state.params.interface || abode.config.interface;
  abode.config.interface = $scope.interface;
}]);

home.directive('controller', [function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      type: '@',
      name: '@',
      title: '@',
      icon: '@',
      spin: '@',
      showTitle: '@',
      source: '@',
      action: '@'
    },
    templateUrl: '/views/home/controller.html',
    controller: ['$scope', '$timeout', '$interval', 'Devices', 'Scenes', 'Rooms', function ($scope, $timeout, $interval, Devices, Scenes, Rooms) {
      var types = {
        'device': Devices,
        'room': Rooms,
        'scene': Scenes
      };

      $scope.title = $scope.title || $scope.name;
      $scope.loading = false;
      $scope.failed = false;
      $scope.error = false;
      $scope.pending = false;
      $scope.type = $scope.type || 'device';
      $scope.action = $scope.action || 'open';
      $scope.icon = $scope.icon || 'icon-lightbulb-idea';

      $scope.load = function () {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;
        types[$scope.type].get({'id': $scope.name}).$promise.then(function (obj) {
          $scope.obj = obj;
          $scope.loading = false;
          $scope.error = false;
        }, function () {
          $scope.loading = false;
          $scope.error = true;
        });
      };

      $scope.refresh = function () {
        if (!$scope.obj || $scope.loading) {
          return;
        }

        $scope.loading = true;
        $scope.obj.$refresh().then(function (obj) {
          $scope.obj = obj;
          $scope.loading = false;
          $scope.error = false;
        }, function () {
          $scope.loading = false;
          $scope.error = true;
        });
      };

      $scope.do_action = function () {
        if (!$scope.obj || $scope.failed) {
          $scope.failed = true;
          $timeout(function () {
            $scope.failed = false;
          }, 2000);

          return;
        }

        var func;

        if ($scope.action === 'on') {
          func = $scope.obj.$on;
        } else if ($scope.action === 'off') {
          func = $scope.obj.$off;
        } else if ($scope.action === 'camera') {
          func = $scope.obj.$camera;
        } else if ($scope.action === 'toggle') {
          func = ($scope.obj._on || $scope.obj._lights_on) ? $scope.obj.$off : $scope.obj.$on;
        } else {
          func = $scope.obj.$open;
        }

        $scope.pending = true;
        var result = func.apply($scope.obj);
        if (result && result.then) {
            result.then(function () {
            $scope.pending = false;
            $scope.success = true;
            $timeout(function () {
              $scope.success = false;
            }, 4000);
          }, function (err) {
            $scope.pending = false;
            $scope.failed = true;
            $timeout(function () {
              $scope.failed = false;
            }, 4000);
          });
        } else if (result && result.closed) {
            $scope.pending = false;
            $scope.loading = true;
            result.closed.then(function (result) {
              $scope.loading = false;
            });
        } else {
          $scope.pending = false;
        }
      };

      $scope.load();

      if ($scope.action === 'toggle' || $scope.action === 'open') {
        $scope.loader = $interval($scope.refresh, 5000);
      }

      $scope.$on('$destroy', function () {
        $interval.cancel($scope.loader);
      });

    }]
  };
}]);

home.directive('background', function () {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      format: '@',
      bgA: '@',
      bgB: '@',
      interval: '@',
      url: '@',
      refresh: '@',
      video: '@',
    },
    controller: function ($scope, $interval, $timeout, $state, $window) {

      var updater;

      $scope.interval = $scope.interval || 60;
      $scope.interval = ($scope.interval < 5) ? 5 : $scope.interval;
      $scope.refresh = ($scope.refresh === undefined || $scope.refresh === true) ? true : false;
      $scope.bgA = {};
      $scope.bgB = {};

      var bgStyles = [
        'bgA',
        'bgB',
      ];
      var bgImages = [
        'imgA',
        'imgB',
      ];

      var next = 1;
      var previous = 0;
      var delay;

      var sizeImages = function () {
        var clientWidth = document.body.clientWidth;
        var clientHeight = document.body.clientHeight;

        var clientRatio = parseInt(document.body.clientWidth) / parseInt(document.body.clientHeight);
        var imgAratio = parseInt($scope.imgA.naturalWidth) / parseInt($scope.imgA.naturalHeight);
        var imgBratio = parseInt($scope.imgB.naturalWidth) / parseInt($scope.imgB.naturalHeight);

        if (clientRatio > imgAratio) {
          $scope.imgA.style.width = '100%';
          $scope.imgA.style.height = '';
        } else {
          $scope.imgA.style.width = '';
          $scope.imgA.style.height = '100%';
        }
        if (clientRatio > imgBratio) {
          $scope.imgB.style.width = '100%';
          $scope.imgB.style.height = '';
        } else {
          $scope.imgB.style.width = '';
          $scope.imgB.style.height = '100%';
        }

      };

      $scope.$watch(function(){
          return $window.innerWidth + $window.innerHeight;
      }, sizeImages);

      $timeout(function () {

        $scope.imgA.onload = function () {
          if (delay) {
            $timeout.cancel(delay);
          }

          sizeImages();

          if ($scope.imgA.style.opacity !== 0) {
            $scope.imgA.style.opacity = 1;
            $scope.imgB.style.opacity = 0;
          }

          delay = $timeout(transition, 1000 * $scope.interval);
        };

        $scope.imgB.onload = function () {
          if (delay) {
            $timeout.cancel(delay);
          }

          sizeImages();

          if ($scope.imgB.style.opacity !== 0) {
            $scope.imgA.style.opacity = 0;
            $scope.imgB.style.opacity = 1;
          }

          delay = $timeout(transition, 1000 * $scope.interval);
        };


        $scope.imgA.onerror = $scope.imgB.onerror = function () {
          if (delay) {
            $timeout.cancel(delay);
          }

          console.log('error loading', next);
          delay = $timeout(function () {
            transition(false);
          }, 1000 * $scope.interval)
        };

        transition();
      }, 5000);

      var transition = function (increment) {

        if ($state.current.name != 'main.home') {
          return;
        }

        increment = (increment === undefined) ? true : false;

        if (increment) {
          next = (next === 0) ? 1 : 0;
          previous = (next === 0) ? 1 : 0;
        }

        var random = new Date();
        var uri = $scope.url;
          uri += ($scope.url.indexOf('?') > 0) ? '&' : '?';
          uri += random.getTime();

        $scope[bgImages[next]].src = uri;


      };

      var updateBackground = function () {
        var clientWidth = document.body.clientWidth;
        var clientHeight = document.body.clientHeight;

        if ($state.current.name != 'main.home') {
          return;
        }

        next = (next === 0) ? 1 : 0;
        previous = (next === 0) ? 1 : 0;


        var random = new Date();
        var uri = $scope.url;
          uri += ($scope.url.indexOf('?') > 0) ? '&' : '?';
          uri += random.getTime();


        if ($scope.refresh) {
          var img = new Image();

          img.onerror = function () {
            console.log('Error loading image:', uri);
            $timeout(updateBackground, 1000 * $scope.interval * 2);
          };

        console.dir(document.body.clientWidth);

          img.onload = function () {
            if (clientWidth > clientHeight) {
              $scope[bgStyles[next]].width = '100%';
              $scope[bgStyles[next]].height = '';
            } else {
              $scope[bgStyles[next]].width = '';
              $scope[bgStyles[next]].height = '100%';
            }
            $timeout.cancel(delay);
            $scope[bgStyles[next]]['background-image'] = 'url("' + uri + '")';
            $scope[bgStyles[previous]].transition = 'opacity 5s';
            $scope[bgStyles[previous]].opacity = 0;

            $timeout(function () {
              $scope[bgStyles[next]]['z-index'] = 2;
              $scope[bgStyles[previous]]['z-index'] = 1;
              $scope[bgStyles[previous]].transition = '';
              $scope[bgStyles[previous]].opacity = 1;
            }, (1000 * 4 ) );

            delay = $timeout(updateBackground, 1000 * $scope.interval);

          };
          img.src = uri;

        } else {
          $scope[bgStyles[next]]['background-image'] = 'url("' + uri + '")';
          $scope[bgStyles[next]].opacity = 1;
        }

      };

      //updater = $interval(updateBackground, (1000 * $scope.interval));
      //if ($scope.video === undefined) {
      //  updateBackground();
      //}
      $timeout(function () { console.log($scope.img); }, 5000);

    },
    link: function($scope, element, attrs) {


      if ($scope.video !== undefined) {

        var checker;

        $scope.interval = $scope.interval || 60;
        $scope.interval = ($scope.interval < 5) ? 5 : $scope.interval;

        $scope.img = document.createElement('img');
        $scope.img.style.height = '100%';

        var start = function () {
          var random = new Date();
          var uri = $scope.url;
            uri += ($scope.url.indexOf('?') > 0) ? '&' : '?';
            uri += random.getTime();

          $scope.img.src = uri;
        };

        $scope.img.onload = function () {
          if (checker) {
            clearTimeout(checker);
          }
          checker = setTimeout(start, 10 * 1000);
        };

        $scope.img.onerror = function () {
          if (checker) {
            clearTimeout(checker);
          }
          checker = setTimeout(start, 10 * 1000);
        };
        element[0].appendChild($scope.img);

        start();
      } else {


        $scope.imgA = document.createElement('img');
        //$scope.imgA.style.height = '100%';
        //$scope.imgA.style.minHeight = '100%';
        //$scope.imgA.style.minWidth = '100%';
        //$scope.imgA.style.transition = 'opacity 5s';
        $scope.imgA.style.opacity = 0;
        $scope.imgA.className = 'background';

        $scope.imgB = document.createElement('img');
        //$scope.imgB.style.height = '100%';
        //$scope.imgB.style.minHeight = '100%';
        //$scope.imgB.style.minWidth = '100%';
        //$scope.imgB.style.transition = 'opacity 5s';
        $scope.imgB.style.opacity = 0;
        $scope.imgB.className = 'background';

        element[0].appendChild($scope.imgA);
        element[0].appendChild($scope.imgB);

      }

    },
    template: '<div style="z-index: 1; position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px;">  <div ng-style="bgA" class="background"></div><div ng-style="bgB" class="background"></div></div>',
    replace: true,
  };

});
