'use strict';

angular.module('insteonhub', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.insteonhub', {
    url: '/insteonhub',
    templateUrl: '/views/providers/insteonhub/settings.html',
    controller: 'insteonHubSettings',
    resolve: {
      config: function (insteonhub) {
        return insteonhub.get_config();
      }
    }
  })
})
.service('insteonhub', function (settings) {

  var get_config = function () {

    return settings.get_config('insteonhub');

  };

  var save_config = function (config) {

    return settings.save_config('insteonhub', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('insteonHubSettings', function ($scope, insteonhub, abode, config) {

  $scope.config = config;
  $scope.devices = [
    '/dev/ttyUSB0',
    '/dev/ttyUSB1',
    '/dev/ttyUSB2',
    '/dev/ttyUSB3',
  ];

  $scope.save = function () {

    insteonhub.save($scope.config).then(function () {
      $scope.status = 'saved';

      abode.message({
        'type': 'success',
        'message': 'Insteon Settings Saved'
      });

    }, function (err) {
      abode.message({
        'type': 'failed',
        'message': 'Insteon Settings Failed to Saved',
        'details': err
      });
    });

  };

})
.controller('insteonhubEdit', function () {
  $scope.device = $scope.$parent.device
})
.controller('insteonhubAdd', function ($scope, $http, $timeout, abode) {
  $scope.device = $scope.$parent.device;
  $scope.loading = false;
  $scope.processing = false;
  $scope.device_types = [
    {
      'name': 'Device',
      'capabilities': ['light', 'dimmer'],
      'active': true,
      'type': 'devices'
    },
    {
      'name': 'Scene',
      'capabilities': ['onoff'],
      'active': true,
      'type': 'scenes'
    },
    {
      'name': 'Room',
      'capabilities': ['onoff'],
      'active': false,
      'type': 'rooms'
    },
  ];

  $scope.changeType = function (t) {
    $scope.type = t;
    $scope.device.capabilities = t.capabilities;
    $scope.device.active = t.active;

    $scope.loading = true;
    $http.get(abode.url('/api/insteonhub/' + t.type).value()).then(function (response) {
      $scope.devices = response.data;
      $scope.loading = false;
    }, function (err) {
      $scope.error = err;
      $scope.loading = false;
    });
  };

  $scope.selectDevice = function (d) {
    $scope.device.name = d.DeviceName;
    $scope.device.config = {
      'type': 'device',
      'DeviceID': d.DeviceID
    }
  };

  $scope.selectScene = function (d) {
    $scope.device.name = d.SceneName;
    $scope.device.config = {
      'type': 'scene',
      'SceneID': d.SceneID
    }
  };

  $scope.selectRoom = function (d) {
    $scope.device.name = d.RoomName;
    $scope.device.config = {
      'type': 'room',
      'RoomID': d.RoomID
    }
  };

  $scope.reload = function () {
    $scope.processing = true;

    $http.post(abode.url('/api/insteonhub/refresh').value()).then(function (response) {
      $scope.processing = false;
      $scope.changeType($scope.type);
    }, function (err) {
      $scope.error = err;
      $scope.processing = false;
    });
  };

});
