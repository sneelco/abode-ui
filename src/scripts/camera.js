angular.module('camera', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('main.settings.camera', {
    url: '/camera',
    templateUrl: '/views/providers/camera/settings.html',
    controller: 'cameraSettings',
    resolve: {
      config: function (camera) {
        return camera.get_config();
      }
    }
  });
})
.service('camera', function ($q, settings) {

  var get_config = function () {

    return settings.get_config('camera');

  };

  var save_config = function (config) {

    return settings.save_config('camera', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('cameraSettings', function ($scope, camera, notifier, config) {
  $scope.config = config;
  $scope.status = 'idle';

  $scope.save = function () {

    camera.save($scope.config).then(function () {
      $scope.status = 'saved';

      notifier.notify({
        'status': 'success',
        'message': 'Wunderground Settings Saved'
      });

    }, function (err) {
      notifier.notify({
        'status': 'failed',
        'message': 'Wunderground Settings Failed to Saved',
        'details': err
      });
    });

  };
})
.controller('cameraEdit', function ($scope) {
  $scope.device = $scope.$parent.device;

})
.controller('cameraAdd', function ($scope) {
  $scope.device = $scope.$parent.device;
  $scope.device.capabilities = ['camera'];
  $scope.device.active = true;
});
