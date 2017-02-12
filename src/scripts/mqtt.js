var mqtt = angular.module('mqtt', []);
mqtt.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.mqtt', {
    url: '/mqtt',
    templateUrl: '/views/providers/mqtt/settings.html',
    controller: 'mqttSettings',
    resolve: {
      config: function (mqtt) {
        return mqtt.get_config();
      }
    }
  });
});

mqtt.service('mqtt', function ($q, settings) {

  var get_config = function () {

    return settings.get_config('mqtt');

  };

  var save_config = function (config) {

    return settings.save_config('mqtt', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

});

mqtt.controller('mqttSettings', function ($scope, mqtt, abode, config) {
  $scope.config = config;
  $scope.status = 'idle';

  $scope.save = function () {

    mqtt.save($scope.config).then(function () {
      $scope.status = 'saved';

      abode.message({
        'type': 'success',
        'message': 'MQTT Settings Saved'
      });

    }, function (err) {
      abode.message({
        'type': 'failed',
        'message': 'MQTT Settings Failed to Saved',
        'details': err
      });
    });

  };
});

mqtt.controller('mqttEdit', function ($scope) {
  $scope.device = $scope.$parent.device;
  $scope.parsers = [
    {'name': 'WeeWx', 'value': 'weewx'}
  ];

});

mqtt.controller('mqttAdd', function ($scope) {
  $scope.device = $scope.$parent.device;
  $scope.parsers = [
    {'name': 'WeeWx', 'value': 'weewx'}
  ];
});
