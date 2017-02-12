var lutroncaseta = angular.module('lutroncaseta', []);

lutroncaseta.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.lutroncaseta', {
    url: '/lutroncaseta',
    templateUrl: '/views/providers/lutroncaseta/settings.html',
    controller: 'lutroncasetaSettings',
    resolve: {
      config: function (lutroncaseta) {
        return lutroncaseta.get_config();
      }
    }
  });
});

lutroncaseta.service('lutroncaseta', function ($q, settings) {

  var get_config = function () {

    return settings.get_config('lutroncaseta');

  };

  var save_config = function (config) {

    return settings.save_config('lutroncaseta', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

});

lutroncaseta.controller('lutroncasetaSettings', function ($scope, lutroncaseta, abode, config) {
  $scope.config = config;
  $scope.status = 'idle';

  $scope.save = function () {

    lutroncaseta.save($scope.config).then(function () {
      $scope.status = 'saved';

      abode.message({
        'type': 'success',
        'message': 'Lutron Caseta Settings Saved'
      });

    }, function (err) {
      abode.message({
        'type': 'failed',
        'message': 'Lutron Caseta Settings Failed to Saved',
        'details': err
      });
    });

  };
});

lutroncaseta.controller('lutroncasetaEdit', function ($scope) {
  $scope.device = $scope.$parent.device;

});

lutroncaseta.controller('lutroncasetaAdd', function ($scope) {
  $scope.device = $scope.$parent.device;
  $scope.device.capabilities = ['weather','temperature_sensor', 'humidity_sensor'];
});
