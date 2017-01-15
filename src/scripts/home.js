var home = angular.module('abode.home', []);

home.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('main.home', {
      url: '/Home/:interface',
      template: '<interface class="interface" time="time" client="client"></interface>',
      controller: 'homeController',
      resolve: {
        'interface': ['$stateParams', '$q', 'auth', 'abode', function ($stateParams, $q, auth, abode) {
          var interface,
            defer = $q.defer();

          if (auth.device && auth.device.config && auth.device.config.interface) {
            interface = auth.device.config.interface;
          } else {
            defer.reject({'state': 'welcome_devices'});
            return defer.promise;
          }

          abode.config.interface = $stateParams.interface || abode.config.interface;

          defer.resolve();

          return defer.promise;
        }],
        'time': ['$q', '$http', 'abode', function ($q, $http, abode) {
          var defer = $q.defer();

          $http.get(abode.url('/api/time').value()).then(function (response) {
            defer.resolve(response.data);
          }, function () {
            defer.resolve({});
          });
          
          return defer.promise;
        }]
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

home.factory('EventCache', ['$resource', '$http', '$q', 'abode', function($resource, $http, $q, abode) {

  var eventcache = $resource(abode.url('/api/events?last=:last'),{},{});

  return eventcache;
}]);

home.directive('interface', ['$sce', 'abode', function ($sce, abode) {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      'view': '@',
      'time': '=',
      'client': '='
    },
    controller: ['$scope', function ($scope) {
    }],
    templateUrl: function () {
      //return $sce.trustAsResourceUrl(abode.url('/api/abode/views/home.html').value());
      return $sce.trustAsResourceUrl(abode.url('/api/interfaces/' + abode.config.interface + '/template').value());
    },
  };
}]);

home.directive('events', [function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      'show': '=',
      'excludeEvents': '=',
      'excludeNames': '=',
      'excludeTags': '=',
      'excludeTypes': '='
    },
    templateUrl: 'views/home/events.html',
    controller: ['$scope', 'abode', 'EventCache', function ($scope, abode, EventCache) {
      $scope.show = $scope.show || 100;
      $scope.exclude_events = (Array.isArray($scope.excludeEvents)) ? $scope.excludeEvents : [];
      $scope.exclude_names = (Array.isArray($scope.excludeBames)) ? $scope.excludeNames : [];
      $scope.exclude_tags = (Array.isArray($scope.excludeTags)) ? $scope.excludeTags : [];
      $scope.exclude_types = (Array.isArray($scope.excludeTypes)) ? $scope.excludeTypes : [];

      $scope.events = [];
      var event_details= {
        'UNKNOWN': {'icon': 'icon-question-sign', 'message': '', 'key': ''},
        'HEARTBEAT': {'icon': 'icon-heart', 'message': 'Abode Heartbeat', 'key': '', 'name': false},
        'TIME_CHANGE': {'icon': 'icon-time', 'message': 'Time Change', 'key': '', 'name': false},
        'DAY_CHANGE': {'icon': 'icon-calendarthree', 'message': 'Day Change', 'key': '', 'name': false},
        'SUNSET': {'icon': 'icon-sunset', 'message': 'Sunset', 'key': '', 'name': false},
        'SUNRISE': {'icon': 'icon-sunrise', 'message': 'Sunrise', 'key': '', 'name': false},
        'SOLAR_NOON': {'icon': 'icon-sun-day', 'message': 'Noon', 'key': '', 'name': false},
        'ON': {'icon': '', 'message': 'is now on', 'key': ''},
        'OFF': {'icon': '', 'message': 'is now off', 'key': ''},
        'OPEN': {'icon': '', 'message': 'is now open', 'key': ''},
        'CLOSE': {'icon': '', 'message': 'is now closed', 'key': ''},
        'LIGHTS_ON': {'icon': 'icon-lightbulb-idea', 'message': 'is now on', 'key': ''},
        'LIGHTS_OFF': {'icon': 'icon-lightbulb-idea', 'message': 'is now off', 'key': ''},
        'FANS_ON': {'icon': 'icon-fan', 'message': 'is now on', 'key': ''},
        'FANS_OFF': {'icon': 'icon-fan', 'message': 'is now off', 'key': ''},
        'APPLIANCES_ON': {'icon': '', 'message': 'is now on', 'key': ''},
        'APPLIANCES_OFF': {'icon': '', 'message': 'is now off', 'key': ''},
        'CONDITIONING_ON': {'icon': '', 'message': 'is now on ', 'key': '_mode'},
        'CONDITIONING_OFF': {'icon': '', 'message': 'is now off', 'key': ''},
        'WINDOWS_OPEN': {'icon': 'fi-window', 'message': 'is now open', 'key': ''},
        'WINDOWS_CLOSED': {'icon': 'fi-window', 'message': 'is now closed', 'key': ''},
        'DOORS_OPEN': {'icon': 'fi-door-closed', 'message': 'is now open', 'key': ''},
        'DOORS_CLOSED': {'icon': 'fi-door-closed', 'message': 'is now closed', 'key': ''},
        'SHADES_OPEN': {'icon': '', 'message': 'is now open', 'key': ''},
        'SHADES_CLOSED': {'icon': '', 'message': 'is now closed', 'key': ''},
        'MOTION_ON': {'icon': 'fi-motion', 'message': 'detected motion', 'key': ''},
        'MOTION_OFF': {'icon': 'fi-motion', 'message': 'no longer detects motion', 'key': ''},
        'TEMPERATURE_CHANGE': {'icon': 'wi wi-thermometer wi-fw', 'message': 'temperature is now', 'key': '_temperature', 'units': '°'},
        'TEMPERATURE_UP': {'icon': 'wi wi-thermometer wi-fw', 'message': 'temperature went up to', 'key': '_temperature', 'units': '°'},
        'TEMPERATURE_DOWN': {'icon': 'wi wi-thermometer wi-fw', 'message': 'temperature went down to', 'key': '_temperature', 'units': '°'},
        'HUMIDITY_CHANGE': {'icon': 'wi wi-humidity wi-fw', 'message': 'humidity is now', 'key': '_humidity', 'units': '%'},
        'HUMIDITY_UP': {'icon': 'wi wi-humidity wi-fw', 'message': 'humidity went up to', 'key': '_humidity', 'units': '%'},
        'HUMIDITY_DOWN': {'icon': 'wi wi-humidity wi-fw', 'message': 'humidity went down to', 'key': '_humidity', 'units': '%'},
        'LUMACITY_CHANGE': {'icon': 'wi wi-day-sunny wi-fw', 'message': 'lumens are now', 'key': '_lumens', 'units': '%'},
        'LUMACITY_UP': {'icon': 'wi wi-day-sunny wi-fw', 'message': 'lumens went up to', 'key': '_lumens', 'units': '%'},
        'LUMACITY_DOWN': {'icon': 'wi wi-day-sunny wi-fw', 'message': 'lumens went down to', 'key': '_lumens', 'units': '%'},
        'UPDATED': {'icon': 'icon-edit', 'message': ' has been updated', 'key': ''},
      };

      var excluded_tag = function (tags) {
        tags = tags || [];
        var has_tag = false;

        tags.forEach(function (tag) {
          has_tag = ($scope.exclude_tags.indexOf(tag) !== -1) ? true : has_tag;
        });

        return has_tag;
      };

      var process_event = function (msg) {
        var details = (event_details[msg.event]) ? event_details[msg.event] : event_details.UNKNOWN;

        msg.icon = details.icon;
        msg.message = details.message || msg.event;
        msg.value = (details.key && msg.object && msg.object[details.key]) ? msg.object[details.key] : '';
        msg.show_name = (details.name === false) ? false : true;
        msg.units = details.units;
        msg.object = msg.object || {};
        msg.object.tags = msg.object.tags || [];

        if ($scope.exclude_events.indexOf(msg.event) === -1 && $scope.exclude_names.indexOf(msg.event) === -1 && $scope.exclude_types.indexOf(msg.type) === -1 && excluded_tag(msg.object.tags) === false) {
          $scope.events.unshift(msg);

          if ($scope.events.length > $scope.show) {
            $scope.events.pop();
          }
        }
      };

      var start_listener = function () {

        abode.scope.$on('ABODE_EVENT', function (event, msg) {
          process_event(msg);
        });

      };

      var last_event = new Date();
      last_event = last_event.getTime() - (1000 * 60 * 30);

      EventCache.query({'last': last_event}).$promise.then(function (response) {
        response = response.map(function (record) { return record.event; });
        response.forEach(process_event);
        start_listener();
      }, function () {
        start_listener();
      });

    }]
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
            match = results.filter(function (iface) { return show === iface.name; });
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

home.controller('homeController', ['$scope', '$state', '$templateCache', 'abode', 'Interfaces', 'time', function ($scope, $state, $templateCache, abode, Interfaces, time) {
  $scope.interface = $state.params.interface || abode.config.interface;
  $scope.client = abode.config.auth.device.config;
  $scope.time = time;

  abode.config.interface = $scope.interface;

  //If we get an EVENTS_RESET event, schedule a refresh
  var time_events = abode.scope.$on('TIME_CHANGE', function (event, msg) {
    angular.merge($scope.time, msg.object);
  });

  abode.get_events();

  $scope.$on('$destroy', function () {
    time_events();
  });

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
      action: '@',
      longPress: '@',
      args: '=?',
      onsuccess: '=',
    },
    templateUrl: '/views/home/controller.html',
    controller: ['$scope', '$timeout', '$interval', 'abode', 'Devices', 'Scenes', 'Rooms', 'Notifications', function ($scope, $timeout, $interval, abode, Devices, Scenes, Rooms, Notifications) {
      var types = {
        'devices': Devices, 'device': Devices,
        'rooms': Rooms, 'room': Rooms,
        'scenes': Scenes, 'scene': Scenes,
        'notifications': Notifications, 'notification': Notifications
      };

      var success_splay = 1000 * 60 * Math.floor((Math.random() * 5) + 5);
      var error_splay = 1000 * Math.floor((Math.random() * 5) + 1);
      var press_time = 0;
      var press_timer;

      $scope.title = $scope.title || $scope.name;
      $scope.loading = false;
      $scope.failed = false;
      $scope.error = false;
      $scope.pending = false;
      $scope.type = $scope.type || 'device';
      $scope.action = $scope.action || 'open';
      $scope.args = $scope.args || [];
      $scope.icon = $scope.icon || 'icon-lightbulb-idea';


      //If we get an EVENTS_RESET event, schedule a refresh
      var feed_detector = abode.scope.$on('EVENTS_RESET', function (event, msg) {
        $scope.loader = $timeout($scope.refresh, error_splay);
      });

      var event_handler = abode.scope.$on('ABODE_EVENT', function (event, msg) {

        if (!$scope.obj) {
          return;
        }

        if (msg.type === $scope.type && $scope.name === msg.name) {
          if ($scope.loader) {
            $timeout.cancel($scope.loader);
          }

          if (msg.event === 'ON' && $scope.obj._on === false)  {
            //$scope.obj._on = true;
          } else if (msg.event === 'OFF' && $scope.obj._on === true) {
            //$scope.obj._on = false;
          } else if (msg.event === 'UPDATED') {

            for (var key in msg.object) {
              if (msg.object.hasOwnProperty(key) && key[0] === '_') {
                $scope.obj[key] = msg.object[key];
              }
            }
          }

          //If we got an event, hold off on our normal refresh
          if (['toggle', 'open', 'on', 'off'].indexOf($scope.action) > -1) {
            $scope.loader = $timeout($scope.refresh, success_splay);
          }

          $scope.$digest();
        }
      });

      $scope.load = function () {
        if (!types[$scope.type]) {
          console.log('Invalid type: ', $scope.type);
          $scope.error = true;
          return;
        }
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;
        $scope.error = false;

        types[$scope.type].get({'id': $scope.name}).$promise.then(function (result) {
          $scope.obj = result;
          $scope.loading = false;
          $scope.error = false;


          if (['toggle', 'open', 'on', 'off'].indexOf($scope.action) > -1) {
            $scope.loader = $timeout($scope.refresh, success_splay);
          }

        }, function () {
          $scope.loading = false;
          $scope.error = true;

          //If we got an error, try again in 5 seconds
          $scope.loader = $timeout($scope.load, error_splay);
        });
      };

      $scope.refresh = function () {
        if (!$scope.obj || $scope.loading) {
          return;
        }

        $scope.loading = true;
        $scope.obj.$refresh().then(function () {
          $scope.loading = false;
          $scope.error = false;

          $scope.loader = $timeout($scope.refresh, success_splay);
        }, function () {
          $scope.loading = false;
          $scope.error = true;

          $scope.loader = $timeout($scope.refresh, error_splay);
        });
      };

      $scope.start = function () {
        press_time = new Date();
        press_time = press_time.getTime();

        press_timer = $timeout(function () {
          $scope.do_action($scope.longPress || $scope.action);
        }, 2000);
      };

      $scope.stop = function () {
        var now = new Date();
        now = now.getTime();

        $timeout.cancel(press_timer);

        if (now - press_time <= 500) {
          $scope.do_action($scope.action);
        } else {
          $scope.do_action($scope.longPress || $scope.action);
        }
      };

      $scope.do_action = function (action) {
        if (!$scope.obj || $scope.failed) {
          $scope.failed = true;
          $timeout(function () {
            $scope.failed = false;
          }, 2000);

          return;
        }

        var func;

        if ($scope.loader) {
          $timeout.cancel($scope.loader);
        }
        $scope.failed = false;
        
        if (action === 'toggle') {
          func = ($scope.obj._on || $scope.obj._lights_on) ? $scope.obj.$off : $scope.obj.$on;
        } else if ($scope.obj['$' + action]) {
          func = $scope.obj['$' + action];
        } else if (action === 'open_controls') {
          func = function () {
            return $scope.obj.$open(true);
          }
        } else {
          func = $scope.obj.$open;
        }

        $scope.pending = true;
        var result = func.apply($scope.obj, $scope.args);
        if (result && result.then) {
            result.then(function () {
            $scope.pending = false;
            $scope.success = true;
            if (action === 'toggle' || action === 'open' || action === 'on' || action === 'toggle') {
              $scope.loader = $timeout($scope.refresh, 5000);
            }
            if ($scope.onsuccess) {
              $scope.onsuccess();
            }
            $timeout(function () {
              $scope.success = false;
            }, 4000);
          }, function (err) {
            $scope.pending = false;
            $scope.failed = true;
            if (action === 'toggle' || action === 'open' || action === 'on' || action === 'toggle') {
              $scope.loader = $timeout($scope.refresh, 5000);
            }
            $timeout(function () {
              $scope.failed = false;
            }, 4000);
          });
        } else if (result && result.closed) {
            $scope.pending = false;
            $scope.loading = true;
            if (action === 'toggle' || action === 'open' || action === 'on' || action === 'toggle') {
              $scope.loader = $timeout($scope.refresh, 5000);
            }
            result.closed.then(function (result) {
              if ($scope.onsuccess) {
                $scope.onsuccess();
              }
              $scope.loading = false;
            });
        } else {
          if (action === 'toggle' || action === 'open' || action === 'on' || action === 'toggle') {
            $scope.loader = $timeout($scope.refresh, 5000);
          }
          $scope.pending = false;
        }
      };

      $scope.loader = $timeout($scope.load, 100);

      $scope.$on('$destroy', function () {
        event_handler();
        feed_detector();
        $timeout.cancel($scope.loader);
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
        var clientWidth = window.innerWidth;
        var clientHeight = window.innerHeight;

        var clientRatio = parseInt(clientWidth) / parseInt(clientHeight);
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
          }, 1000 * $scope.interval);
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
      //$timeout(function () { console.log($scope.img); }, 5000);

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
    template: '<div style="position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px;">  <div ng-style="bgA" class="background"></div><div ng-style="bgB" class="background"></div></div>',
    replace: true,
  };

});
