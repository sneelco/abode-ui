angular.module('rad', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('index.settings.rad', {
    url: '/rad',
    templateUrl: '/views/providers/rad/settings.html',
    controller: 'radSettings',
    resolve: {
      config: function (rad) {
        return rad.get_config();
      }
    }
  });
})
.service('rad', function (settings) {

  var get_config = function () {

    return settings.get_config('rad');

  };

  var save_config = function (config) {

    return settings.save_config('rad', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('radSettings', function ($scope, rad, notifier, config) {

  $scope.config = config;

  $scope.save = function () {

    rad.save($scope.config).then(function () {
      $scope.status = 'saved';

      notifier.notify({
        'status': 'success',
        'message': 'Rad Settings Saved'
      });

    }, function (err) {
      notifier.notify({
        'status': 'failed',
        'message': 'Rad Settings Failed to Saved',
        'details': err
      });
    });

  };

})
.controller('radEdit', function () {
  $scope.device = $scope.$parent.device;
})
.controller('radAdd', function () {
  $scope.device = $scope.$parent.device;
});
