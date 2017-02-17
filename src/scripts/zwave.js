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

zwave.controller('zwaveAdd', function ($scope) {
  $scope.device = $scope.$parent.device;
  $scope.device.capabilities = ['weather','temperature_sensor', 'humidity_sensor'];
});
