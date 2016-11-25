angular.module('insteon', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.insteon', {
    url: '/settings',
    templateUrl: '/views/providers/insteon/settings.html',
    controller: 'insteonSettings',
    resolve: {
      config: function (insteon) {
        return insteon.get_config();
      }
    }
  });
})
.service('insteon', function (settings) {

  var get_config = function () {

    return settings.get_config('insteon');

  };

  var save_config = function (config) {

    return settings.save_config('insteon', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('insteonSettings', function ($scope, insteon, abode, config) {

  $scope.config = config;
  $scope.devices = [
    '/dev/ttyUSB0',
    '/dev/ttyUSB1',
    '/dev/ttyUSB2',
    '/dev/ttyUSB3',
  ];

  $scope.save = function () {

    insteon.save($scope.config).then(function () {
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
.controller('insteonEdit', function () {
  $scope.device = $scope.$parent.device;
})
.controller('insteonAdd', function ($scope, $http, $timeout, abode) {
  $scope.device = $scope.$parent.device;
  $scope.link_status = 'idle';
  $scope.device_types = [
    {
      'name': 'Dimmable Light',
      'capabilities': ['light', 'dimmer'],
      'link_mode': 'responder',
      'active': true,
    },
    {
      'name': 'On/Off Switch',
      'capabilities': ['light', 'onoff'],
      'link_mode': 'responder',
      'active': true,
    },
    {
      'name': 'Door Sensor',
      'capabilities': ['door', 'onoff'],
      'link_mode': 'responder',
      'active': false,
    },
    {
      'name': 'Window Sensor',
      'capabilities': ['window', 'onoff'],
      'link_mode': 'responder',
      'active': false,
    },
    {
      'name': 'Motion Sensor',
      'capabilities': ['motion_sensor', 'onoff'],
      'link_mode': 'responder',
      'active': false,
    }
  ];

  $scope.changeType = function (t) {
    $scope.type = t;
    $scope.device.capabilities = t.capabilities;
    $scope.device.active = t.active;
  };

  $scope.get_last = function () {
    $http.get(abode.url('/api/insteon/linking/last').value()).then(function (response) {
      $scope.device.config = response.data;
      $scope.link_status = 'idle';
    }, function (err) {
      $scope.error = err;
    });
  };
  $scope.check_linking = function () {
    $http.get(abode.url('/api/insteon/linking/status').value()).then(function (response) {
      if (!response.data.linking) {
        $scope.link_status = 'idle';
        $scope.get_last();

      } else {
        $timeout($scope.check_linking, 2000);
      }
    }, function (err) {
      $scope.error = err;
    });
  };

  $scope.start_linking = function () {
    $scope.link_status = 'linking';

    $http.post(abode.url('/api/insteon/linking/start').value(), {'auto_add': false, 'type': $scope.type.link_mode}).then(function (response) {
      $timeout($scope.check_linking, 2000);
    }, function (err) {
      $scope.error = err;
      $scope.link_status = 'idle';
    });

  };

  $scope.cancel_linking = function () {

    $http.post(abode.url('/api/insteon/linking/stop').value()).then(function (response) {
      $scope.link_status = 'idle';
    }, function (err) {
      $scope.link_status = 'linking';
    });

  };

});
