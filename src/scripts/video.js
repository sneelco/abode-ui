angular.module('video', [])
.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('index.settings.video', {
    url: '/video',
    templateUrl: '/views/providers/video/settings.html',
    controller: 'videoSettings',
    resolve: {
      config: function (video) {
        return video.get_config();
      }
    }
  });
})
.service('video', function (settings) {

  var get_config = function () {

    return settings.get_config('video');

  };

  var save_config = function (config) {

    return settings.save_config('video', config);

  };

  return {
    get_config: get_config,
    save: save_config
  };

})
.controller('videoSettings', function ($scope, video, notifier, config) {

  $scope.config = config;

  $scope.save = function () {

    video.save($scope.config).then(function () {
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
.controller('videoEdit', function () {
  $scope.device = $scope.$parent.device;
})
.controller('videoAdd', function () {
  $scope.device = $scope.$parent.device;
});
