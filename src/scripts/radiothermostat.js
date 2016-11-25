'use strict';

angular.module('radiothermostat', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('index.settings.radiothermostat', {
    url: '/radiothermostat',
    templateUrl: '/views/providers/radiothermostat/settings.html',
    controller: 'radiothermostatSettings',
    resolve: {
      config: function (radiothermostat) {
        return radiothermostat.get_config();
      }
    }
  })
})
.service('radiothermostat', function (settings) {

  var get_config = function () {

    return settings.get_config('radiothermostat');

  };

  var save_config = function (config) {

    return settings.save_config('radiothermostat', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('radiothermostatSettings', function ($scope, radiothermostat, notifier, config) {

  $scope.config = config;

  $scope.save = function () {

    radiothermostat.save($scope.config).then(function () {
      $scope.status = 'saved';

      notifier.notify({
        'status': 'success',
        'message': 'Radiothermostat Settings Saved'
      });

    }, function (err) {
      notifier.notify({
        'status': 'failed',
        'message': 'Radiothermostat Settings Failed to Saved',
        'details': err
      });
    });

  };

})
.controller('radiothermostatEdit', function () {
  $scope.device = $scope.$parent.device
})
.controller('radiothermostatAdd', function () {
  $scope.device = $scope.$parent.device
});
