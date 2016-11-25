'use strict';

angular.module('ifttt', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.ifttt', {
    url: '/ifttt',
    templateUrl: '/views/providers/ifttt/settings.html',
    controller: 'iftttSettings',
    resolve: {
      config: function (ifttt) {
        return ifttt.get_config();
      }
    }
  })
})
.service('ifttt', function (settings) {

  var get_config = function () {

    return settings.get_config('ifttt');

  };

  var save_config = function (config) {

    return settings.save_config('ifttt', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('iftttSettings', function ($scope, ifttt, abode, config) {

  $scope.config = config;

  $scope.save = function () {

    ifttt.save($scope.config).then(function () {
      $scope.status = 'saved';

      abode.message({
        'type': 'success',
        'message': 'Radiothermostat Settings Saved'
      });

    }, function (err) {
      abode.message({
        'type': 'failed',
        'message': 'Radiothermostat Settings Failed to Saved',
        'details': err
      });
    });

  };

})
.controller('iftttEdit', function () {
  $scope.device = $scope.$parent.device
})
.controller('iftttAdd', function () {
  $scope.device = $scope.$parent.device
});
