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

  var interfaces = $resource(abode.url('/api/abode/views/:name'),{
    'name': '@name'
  },{
    'create': {'method': 'PUT'},
  });

  interfaces.get = function (name) {
    var defer = $q.defer();

    $http.get(abode.url('/api/abode/views/' + name).value()).then(function (result) {
      defer.resolve(result.data);
    }, function (err) {
      defer.reject(err);
    });

    return defer.promise;
  };

  interfaces.save = function (name, data) {
    var defer = $q.defer();

    $http.put(abode.url('/api/abode/views/' + name).value(), data, {'headers': {'Content-Type': 'text/plain'}}).then(function (result) {
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
      return $sce.trustAsResourceUrl(abode.url('/api/abode/views/' + abode.config.interface).value());
    }
  };
}]);

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
      $scope.loading = true;
      $scope.failed = false;
      $scope.error = false;
      $scope.pending = false;
      $scope.type = $scope.type || 'device';
      $scope.action = $scope.action || 'open';
      $scope.icon = $scope.icon || 'icon-lightbulb-idea';

      $scope.load = function () {
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
        } else if ($scope.action === 'toggle') {
          func = ($scope.obj._on || $scope.obj._lights_on) ? $scope.obj.$off : $scope.obj.$on;
        } else {
          func = $scope.obj.$open;
        }

        $scope.pending = true;
        var result = func.apply($scope.obj);
        if (result.then) {
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
        } else {
          $scope.pending = false;
        }
      };

      $scope.load();

      if ($scope.action === 'toggle') {
        $scope.loader = $interval($scope.load, 5000);
      }

      $scope.$on('$destroy', function () {
        $interval.cancel($scope.loader);
      });

    }]
  }
}]);
