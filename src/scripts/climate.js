angular.module('climate', ['ui.bootstrap'])
.service('climate', function ($interval, $timeout, $http, $state) {
  var rooms = {};
  var states = [];
  var loader;
  var updater;

  var errorResponse = function (room) {

    return function (response) {
      //console.log('Error getting devices for room %s: %s', room, response);
      return;
    };

  };

  var parseRoom = function (room) {

    return function (response) {
      rooms[room] = response.data;
    };

  };

  var getRoom = function (room) {

    $http({ url: '/api/rooms/' + room + '/devices' }).then(parseRoom(room), errorResponse(room));

  };

  var load = function () {
    if (states.indexOf($state.current.name) === -1) {
      return;
    }

    Object.keys(rooms).forEach(getRoom);

  };

  var register_state = function(state) {
    if (states.indexOf(state) === -1) {
      states.push(state);
    }
  };

  updater = $interval(load, 10000);

  return {
    add_room: function (room) {

      if (rooms[room] === undefined) {
        rooms[room] = [];
      }

      if (loader !== undefined) {
        $timeout.cancel(loader);
      }

      loader = $timeout(load, 500);
    },
    rooms: rooms,
    get: function (room) {
      return rooms[room] || [];
    },
    register: register_state
  };
})
.directive('climate', function () {

  return {
    restrict: 'E',
    transclude: true,
    scope: {
      room: '@',
      stat: '@',
      mode: '@',
      show_cool: '@',
      show_heat: '@',
      show_fan: '@',
      interval: '@',
      top: '@',
      bottom: '@',
      left: '@',
      right: '@',
      height: '@',
      width: '@'
    },
    controller: function ($scope, $interval, $uibModal, $state, climate, devices, rooms) {
      var intervals = [];
      climate.add_room($scope.room);
      climate.register($state.current.name);

      $scope.interval = $scope.interval || 2;
      $scope.devices = [];
      $scope.value = '?';
      $scope.styles = {
      };
      $scope.is_fan = false;
      $scope.is_cool = false;
      $scope.is_heat = false;
      $scope.open = rooms.view;

      var temp_index = 0;

      var value_alternator = function () {

        var devs = climate.rooms[$scope.room].filter(function (device) {
          return (device.capabilities.indexOf('temperature_sensor') !== -1);
        });

        temp_index += 1;
        if (temp_index >= devs.length) {
          temp_index = 0;
        }

      };
      $scope.openDetails = function () {
        $uibModal.open({
          animation: $scope.animationsEnabled,
          templateUrl: 'climateDevices.html',
          size: 'lg',
          controller: function ($scope, $uibModalInstance, $interval, room, climate) {
            var intervals = [];
            $scope.devices = climate.rooms[room];

            $scope.ok = function () {
              $uibModalInstance.close();
            };

            $scope.open = function (device) {
              var modal = devices.openDevice(device);
              modal.result.then(function(config) {
                if (config.recurse) {
                  $uibModalInstance.close(config);
                }
              });
            };

            $scope.has_capability = function (device, cap) {
              return (device.capabilities.indexOf(cap) !== -1);
            };

            var getDevices = function () {
              var devices = climate.rooms[room];
              if (devices.length > 0) {
                $scope.devices = devices;
              } else {
                console.dir(devices);
              }
            };
            getDevices();
            intervals.push($interval(getDevices, 5000));

            $scope.$on('destroy', function () {
              intervals.forEach($interval.cancel);
            });
          },
          resolve: {
            room: function () {
              return $scope.room;
            }
          }
        });
      };

      var parseRoom = function () {
        var data = climate.rooms[$scope.room] || [];

        var count = 0,
          fan = false,
          cool = false,
          heat = false;

        data.forEach(function (device) {
          if (device.capabilities.indexOf('temperature_sensor') !== -1) {
            if (count === temp_index) {
              $scope.value = Math.floor(device[$scope.stat]);
            }
            count += 1;
          }
          if (device.capabilities.indexOf('fan') !== -1) {
            fan = (device._on === true) ? true : fan;
          }
          if (device.capabilities.indexOf('conditioner') !== -1 && device._mode === 'COOL') {
            cool = true;
          }
          if (device.capabilities.indexOf('conditioner') !== -1 && device._mode === 'HEAT') {
            heat = true;
          }

        });

        $scope.is_fan = (fan) ? true : false;
        $scope.is_cool = (cool) ? true : false;
        $scope.is_heat = (heat) ? true : false;
        $scope.devices = data;
      };



      intervals.push($interval(value_alternator, 5000));
      intervals.push($interval(parseRoom, (1000)));

      //Clean our intervals
      $scope.$on('$destroy', function () {
        intervals.forEach($interval.cancel);
      });
    },
    template: '<li><button ng-click="open(room)" class="status border-default img-circle"><div class="climate-value">{{value}}</div><span class="climate-icon climate-fan bg-success img-circle" ng-show="is_fan"><i class="icon-fan"></i></span><span class="climate-icon bg-info climate-cool img-circle" ng-show="is_cool"><i class="icon-snow"></i></span><span class="climate-icon bg-danger climate-heat img-circle" ng-show="is_heat"><i class="icon-fire"></i></span></button></li>',
    replace: true,
  };

});
