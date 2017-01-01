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
    controller: function ($scope, $interval, $http, $element, $transclude, $state, weather) {
      var intervals = [];


      $scope.time = $scope.$parent.time;
      $scope.client = $scope.$parent.client;
      
      $scope.interval = $scope.interval || 5;
      $scope.parsed = '?';
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

weather.directive('weatherStatus', function () {

  return {
    restrict: 'E',
    scope: {
    },
    replace: true,
    templateUrl: 'views/weather/status.html',
    controller: ['$scope', '$interval', '$timeout', 'abode', 'Devices', function ($scope, $interval, $timeout, abode, Devices) {
      var icons = {
         'day-chanceflurries': 'wi-day-snow',
         'day-chancerain': 'wi-day-rain',
         'day-chancesleet': 'wi-day-sleet',
         'day-chancesnow': 'wi-day-snow',
         'day-chancetstorms': 'wi-day-storm-showers',
         'day-clear': 'wi-day-sunny',
         'day-cloudy': 'wi-day-cloudy',
         'day-flurries': 'wi-day-snow',
         'day-fog': 'wi-day-fog',
         'day-hazy': 'wi-day-haze',
         'day-mostlycloudy': 'wi-day-cloudy',
         'day-mostlysunny': 'wi-day-sunny-overcast',
         'day-partlycloudy': 'wi-day-sunny-overcast',
         'day-partlysunny': 'wi-day-cloudy',
         'day-rain': 'wi-day-rain',
         'day-sleet': 'wi-day-sleet',
         'day-snow': 'wi-day-snow',
         'day-sunny': 'wi-day-sunny',
         'day-tstorms': 'wi-day-storm-showers',
         'day-unknown': 'wi-na',
         'night-chanceflurries': 'wi-night-snow',
         'night-chancerain': 'wi-night-rain',
         'night-chancesleet': 'wi-night-sleet',
         'night-chancesnow': 'wi-night-snow',
         'night-chancetstorms': 'wi-night-storm-showers',
         'night-clear': 'wi-night-clear',
         'night-cloudy': 'wi-night-cloudy',
         'night-flurries': 'wi-night-snow',
         'night-fog': 'wi-night-fog',
         'night-hazy': 'wi-night-haze',
         'night-mostlycloudy': 'wi-night-cloudy',
         'night-mostlysunny': 'wi-night-alt-partly-cloudy',
         'night-partlycloudy': 'wi-night-alt-partly-cloudy',
         'night-partlysunny': 'wi-night-cloudy',
         'night-rain': 'wi-night-rain',
         'night-sleet': 'wi-night-sleet',
         'night-snow': 'wi-night-snow',
         'night-sunny': 'wi-night-clear',
         'night-tstorms': 'wi-night-storm-showers',
         'night-unknown': 'wi-na',
      };

      $scope.time = $scope.$parent.time;
      $scope.client = $scope.$parent.client;
      $scope.name = $scope.client.weather_device || 'Weather';
      $scope.weatherClass = 'wi-na'; 
      $scope.show_forecast = 'daily';
      $scope.loading = false;
      $scope.error = false;

      $scope.weather = {
        'temperature': '?',
        'temp_high': '?',
        'temp_low': '?',
        'humidity': '?',
        'pressure': '?',
        'pressure_trend': '=',
        'wind': '?',
        'wind_direction': '?',
        'rain': '?',
      };
      $scope.forecast = [];
      $scope.hourly = [];

      //If we get an EVENTS_RESET event, schedule a refresh
      var time_events = abode.scope.$on('TIME_CHANGE', function (event, msg) {
        angular.merge($scope.time, msg.object);
      });


      var success_splay = 1000 * 60 * Math.floor((Math.random() * 5) + 5);
      var error_splay = 1000 * Math.floor((Math.random() * 5) + 1);

      //If we get an EVENTS_RESET event, schedule a refresh
      var feed_detector = abode.scope.$on('EVENTS_RESET', function (event, msg) {
        $scope.loader = $timeout($scope.refresh, error_splay);
      });

      var event_handler = abode.scope.$on('ABODE_EVENT', function (event, msg) {
        if (msg.type === 'device' && $scope.name === msg.name) {
          if ($scope.loader) {
            $timeout.cancel($scope.loader);
          }

          parseWeather(msg.object);

          $scope.loader = $timeout($scope.refresh, success_splay);

          $scope.$digest();
        }
      });

      var getIconClass = function (icon) {
        var daynight = ($scope.$parent.time.is.night) ? 'night' : 'day';
        var key = daynight + '-' + icon;


        var iconClass = (icons[key] !== undefined) ? icons[key] : 'wi-alien';
        return iconClass;
      };

      var parseWeather = function (data) {
        $scope.weather.icon = getIconClass(data._weather.icon);
        $scope.weather.temperature = data._weather.temp || '?';
        $scope.weather.temp_high = data._forecast[0].temp_high || '?';
        $scope.weather.temp_low = data._forecast[0].temp_low || '?';
        $scope.weather.rain = data._weather.rain_total || '?';
        $scope.weather.rain_1hr = data._weather.rain_1hr || '?';
        $scope.weather.humidity = data._weather.humidity || '?';
        $scope.weather.pressure = Math.round(data._weather.pressure) || '?';
        $scope.weather.pressure_trend = data._weather.pressure_trend || '=';
        $scope.weather.wind = data._weather.wind || '0';
        $scope.weather.wind_degrees = data._weather.wind_degrees || '0';
        try {
          $scope.weather.observation = new Date(data.config.raw.current_observation.local_time_rfc822);
        } catch (e) {}

        $scope.wind_degrees = {
          'transform': 'rotate(' + $scope.weather.wind_degrees + 'deg)'
        };
        $scope.forecast = [];

        if (data._forecast[1].temp_high) {
          $scope.forecast.push({
            'day': data._forecast[1].weekday.substring(0,3),
            'icon': getIconClass(data._forecast[1].icon),
            'temp_high': data._forecast[1].temp_high,
            'temp_low': data._forecast[1].temp_low
          });
        }
        if (data._forecast[2].temp_high) {
          $scope.forecast.push({
            'day': data._forecast[2].weekday.substring(0,3),
            'icon': getIconClass(data._forecast[2].icon),
            'temp_high': data._forecast[2].temp_high,
            'temp_low': data._forecast[2].temp_low
          });
        }
        if (data._forecast[3].temp_high) {
          $scope.forecast.push({
            'day': data._forecast[3].weekday.substring(0,3),
            'icon': getIconClass(data._forecast[3].icon),
            'temp_high': data._forecast[3].temp_high,
            'temp_low': data._forecast[3].temp_low
          });
        }
        var hour_index = 0;
        data._hourly.forEach(function (hour) {
          var h = (parseInt(hour.hour, 10) > 12) ? (parseInt(hour.hour, 10) - 12) : parseInt(hour.hour, 10);
          if (h === 0) { h = 12; }
          if (parseInt(hour.hour, 10) < 12) {
            h = h + 'a';
          } else {
            h = h + 'p';
          }
          $scope.hourly[hour_index] = {
            hour: h,
            temp: hour.temp,
            rain: hour.rain,
            icon: getIconClass(hour.icon),
            icon_raw: hour.icon,
          };
          hour_index += 1;
        });
      };

      $scope.refresh = function () {
        if (!$scope.client.show_weather) {
          return;
        }
        $scope.loading = true;
        $scope.error = false;

        Devices.get({'id': $scope.name}).$promise.then(function (record) {
          $scope.loading = false;
          $scope.error = false;

          parseWeather(record);
          $scope.loader = $timeout($scope.refresh, success_splay);
        }, function () {
          $scope.loading = false;
          $scope.error = true;

          $scope.weather.icon = 'wi-na';
          $scope.loader = $timeout($scope.refresh, error_splay);
        });

      };

      $timeout($scope.refresh, 100);

    }]
  };

});
