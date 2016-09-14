var weather = angular.module('abode.weather', []);

weather.service('weather', function ($interval, $timeout, $http, $state, devices) {
  var weather_devices = {};
  var states = [];
  var loader;
  var updater;

  var errorResponse = function (device) {

    return function (response) {
      //console.log('Error getting weather for device %s: %s', device, response);
    };

  };

  var parseWeather = function (device, source) {

    return function (result) {
      weather_devices[source][device] = result;
    };

  };

  var getWeather = function (device, source) {

    devices.get(device).then(parseWeather(device, source), errorResponse(device));

  };

  var load = function () {

    if (states.indexOf($state.current.name) === -1) {
      return;
    }

    Object.keys(weather_devices).forEach(function (source) {
      Object.keys(weather_devices[source]).forEach(function (device) {
        getWeather(device, source);
      });
    });
  };

  var register_state = function(state) {
    if (states.indexOf(state) === -1) {
      states.push(state);
    }
  };

  updater = $interval(load, 1000 * 60);

  return {
    add_device: function (device, source) {
      var src = (source) ? source : 'local';

      if (weather_devices[src] === undefined) {
        weather_devices[src] = {};
      }
      if (weather_devices[src][device] === undefined) {
        weather_devices[src][device] = {};
      }

      if (loader !== undefined) {
        $timeout.cancel(loader);
      }

      loader = $timeout(load, 500);
    },
    get: function (device, source) {
      var src = (source) ? source : 'local';
      return weather_devices[src][device];
    },
    register: register_state
  };

});

weather.directive('weather', function () {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      type: '@',
      value: '@',
      device: '@',
      interval: '@',
      left: '@',
      right: '@',
      top: '@',
      bottom: '@',
      width: '@',
      height: '@',
      size: '@',
      align: '@',
      source: '@',
    },
    controllerAs: 'weather',
    controller: function ($scope, $interval, $http, $element, $transclude, $state, weather, datetime) {
      var intervals = [];

      $scope.interval = $scope.interval || 5;
      $scope.parsed = '?';
      $scope.time = {is: {day: true, night: false}};
      $scope.weather = {
        current: {},
        forecast: {},
      };
      weather.add_device($scope.device, $scope.source);
      weather.register($state.current.name);

      if ($scope.left !== undefined) {
        $element[0].style.left = $scope.left + 'em';
      }

      if ($scope.right !== undefined) {
        $element[0].style.right = $scope.right + 'em';
      }

      if ($scope.top !== undefined) {
        $element[0].style.top = $scope.top + 'em';
      }

      if ($scope.bottom !== undefined) {
        $element[0].style.bottom = $scope.bottom + 'em';
      }

      if ($scope.width !== undefined) {
        $element[0].style.width = $scope.width + 'em';
      }

      if ($scope.height !== undefined) {
        $element[0].style.height = $scope.height + 'em';
      }

      if ($scope.size !== undefined) {
        $element[0].style.fontSize = $scope.size + 'em';
      }

      if ($scope.align !== undefined) {
        $element[0].style.textAlign = $scope.align;
      }

      $element[0].className = 'weather';

      $scope.icons = {
        'chanceflurries': 'snow',
        'chancerain': 'rain',
        'chancesleet': 'rain',
        'chancesnow': 'snow',
        'chancetstorms': 'thunderstorms',
        'clear': 'clear',
        'cloudy': 'cloudy',
        'flurries': 'partlycloudy',
        'fog': 'cloudy',
        'hazy': 'cloudy',
        'mostlycloudy': 'cloudy',
        'mostlysunny': 'partlycloudy',
        'partlycloudy': 'partlycloudy',
        'partlysunny': 'partlycloudy',
        'sleet': 'snow',
        'rain': 'rain',
        'snow': 'snow',
        'sunny': 'clear',
        'tstorms': 'thunderstorms',
        'unknown': 'unknown',
      };

      var parseValue = function (value, data) {

        if (value === undefined) {
          return '?';
        }

        var split = value.split('.'),
          obj = data;

        if (split.length === 0) {
          return '?';
        }


        split.forEach(function (v) {
          if (obj === undefined) {
            return;
          }

          if (obj[v] === undefined) {
            obj = undefined;
            return;
          }

          obj = obj[v];
        });

        return obj || '?';

      };

      var parseWeather = function () {
        $scope.time = datetime.get();
        var tod = ($scope.time.is.night) ? 'night' : 'day';

        var data = weather.get($scope.device, $scope.source);

        $scope.current = data._weather;
        $scope.forecast = data._forecast;
        $scope.moon = data._moon;
        $scope.alerts = data._alerts;

        if ($scope.type === 'icon') {
          var day = parseValue($scope.value, $scope);

          if (day.icon === undefined) {
            $scope.icon_class = 'day_unknown';
            $element[0].className = 'weather weather-icon day_unknown';
            return;
          }

          var icon = $scope.icons[day.icon];
          if (icon === undefined) {
            $element[0].className = 'weather weather-icon day_unknown';
            $scope.icon_class = 'day_unknown';
            return;
          }

          $element[0].className = 'weather weather-icon ' + tod + '_' + icon;
          $scope.icon_class = tod + '_' + icon;
          return;
        }

        $scope.parsed = parseValue($scope.value, $scope.weather);
      };

      intervals.push($interval(parseWeather, 1000));

      $scope.$on('$destroy', function () {
        intervals.forEach($interval.cancel);
      });

      $transclude($scope, function(transEl) {
        $element.append(transEl);
      });

      //getTime();
      //getWeather();
    },
    //template: '<div ng-class="icon_class" ng-transclude></div>',
    //replace: true,
  };

});
