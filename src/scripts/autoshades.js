var autoshades = angular.module('autoshades', []);

autoshades.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.autoshades', {
    url: '/autoshades',
    templateUrl: '/views/providers/autoshades/settings.html',
    controller: 'autoshadesSettings',
    resolve: {
      config: function (autoshades) {
        return autoshades.get_config();
      }
    }
  });
});

autoshades.service('autoshades', function ($q, settings, $uibModal, devices) {

  var get_config = function () {

    return settings.get_config('autoshades');

  };

  var save_config = function (config) {

    return settings.save_config('autoshades', config);

  };

  var add_device = function (assigned) {
    return $uibModal.open({
      animation: true,
      templateUrl: 'views/providers/autoshades/add.device.html',
      size: 'sm',
      controller: function ($scope, $uibModalInstance) {
        $scope.devices = [];
        $scope.assigned = assigned;
        $scope.loading = true;

        $scope.select = function (selected) {
          $uibModalInstance.close({'_id': selected._id, 'name': selected.name, 'min_level': 100});
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss();
        };

        devices.load().then(function (devices) {
          $scope.devices = devices.filter(function (device) { return (device.capabilities.indexOf('shade') >=0); });
          $scope.loading = false;
          $scope.error = false;
        }, function () {
          $scope.loading = false;
          $scope.error = true;
        });
      }
    });
  };

  return {
    get_config: get_config,
    save: save_config,
    addDevice: add_device
  };

});

autoshades.controller('autoshadesSettings', function ($scope, autoshades, abode, config) {
  $scope.config = config;
  $scope.status = 'idle';

  $scope.save = function () {

    zwave.save($scope.config).then(function () {
      $scope.status = 'saved';

      abode.message({
        'type': 'success',
        'message': 'Auto Shades Settings Saved'
      });

    }, function (err) {
      abode.message({
        'type': 'failed',
        'message': 'Auto Shades Settings Failed to Saved',
        'details': err
      });
    });

  };
});

autoshades.controller('autoshadesEdit', function ($scope, autoshades, confirm) {
  $scope.device = $scope.$parent.device;

  $scope.modes = [
    'linear',
    'easein',
    'easeout'
  ];

  $scope.addDevice = function () {
    var assigned = $scope.device.config.devices.map(function (device) {
      return device.name;
    });
    autoshades.addDevice(assigned).result.then(function (device) {
      $scope.device.config.devices.push(device);
    });
  };

  $scope.deleteDevice = function (index) {
    confirm('Are you sure you?').then(function () {
      $scope.device.config.devices.splice(index, 1);
    });
  };
});

autoshades.controller('autoshadesAdd', function ($scope, autoshades, confirm) {
  $scope.device = $scope.$parent.device;
  $scope.device.config = {};
  $scope.device.config.devices = [];
  $scope.device.capabilities = ['onoff'];
  $scope.device.config.mode = 'linear';
  $scope.device.config.min_azimuth = 0;
  $scope.device.config.max_azimuth = 180;
  $scope.device.config.min_azimuth = 0;
  $scope.device.config.cloudy_level = 100;
  $scope.device.config.sunrise_level = 100;
  $scope.device.config.sunset_level = 100;

  $scope.modes = [
    'linear',
    'easein',
    'easeout'
  ];

  $scope.addDevice = function () {
    var assigned = $scope.device.config.devices.map(function (device) {
      return device.name;
    });
    autoshades.addDevice(assigned).result.then(function (device) {
      $scope.device.config.devices.push(device);
    });
  };

  $scope.deleteDevice = function (index) {
    confirm('Are you sure you?').then(function () {
      $scope.device.config.devices.splice(index, 1);
    });
  };
});
