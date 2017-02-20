var zwave = angular.module('zwave', []);

zwave.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.zwave', {
    url: '/zwave',
    templateUrl: '/views/providers/zwave/settings.html',
    controller: 'zwaveSettings',
    resolve: {
      config: function (zwave) {
        return zwave.get_config();
      }
    }
  });
});

zwave.service('zwave', function ($q, settings) {

  var get_config = function () {

    return settings.get_config('zwave');

  };

  var save_config = function (config) {

    return settings.save_config('zwave', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

});

zwave.controller('zwaveSettings', function ($scope, zwave, abode, config) {
  $scope.config = config;
  $scope.status = 'idle';

  $scope.save = function () {

    zwave.save($scope.config).then(function () {
      $scope.status = 'saved';

      abode.message({
        'type': 'success',
        'message': 'Z-Wave Settings Saved'
      });

    }, function (err) {
      abode.message({
        'type': 'failed',
        'message': 'Z-Wave Settings Failed to Saved',
        'details': err
      });
    });

  };
});

zwave.controller('zwaveEdit', function ($scope) {
  $scope.device = $scope.$parent.device;

});

zwave.controller('zwaveAdd', function ($scope, $http, abode) {
  $scope.device = $scope.$parent.device;

  $scope.error = false;
  $scope.loading = false;

  $scope.selectNode = function (device) {
    $scope.selected = device;
    $scope.device.config = device.config;
    $scope.device.capabilities = device.capabilities;
    $scope.device._on = device._on;
    $scope.device._level = device._level;
    $scope.device._mode = device._mode;
    $scope.device._set_point = device._set_point;
    $scope.device._temperature = device._temperature;
    $scope.device._lumens = device._lumens;
    $scope.device._humidity = device._humidity;
    $scope.device._uv = device._uv;
    $scope.device._motion = device._motion;
    $scope.device._battery = device._battery;
  };

  $scope.refresh = function () {
    $scope.loading = true;
    $http.get(abode.url('/api/zwave').value()).then(function (response) {
      $scope.error = false;
      $scope.loading = false;

      $scope.devices = response.data.new_devices;

    }, function () {
      $scope.error = true;
      $scope.loading = false;
    });
  };

  $scope.refresh();
});
