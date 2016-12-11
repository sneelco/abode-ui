var rad = angular.module('rad', []);

rad.config(function($stateProvider, $urlRouterProvider) {

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
});

rad.service('rad', function (settings) {

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

});

rad.controller('radSettings', function ($scope, rad, notifier, config) {

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

});

rad.controller('radEdit', function () {
  $scope.device = $scope.$parent.device;
});

rad.controller('radAdd', ['$scope', '$http', '$timeout', 'abode', function ($scope, $http, $timeout, abode) {
  $scope.loading = true;
  $scope.error = false;
  $scope.detected = [];
  $scope.connecting = false;

  $scope.device = $scope.$parent.device;

  $scope.load = function () {
    $http.get(abode.url('/api/abode/detect_devices').value()).then(function (response) {
      $scope.loading = false;
      $scope.error = false;
      $scope.detected = response.data;
    }, function (err) {
      $scope.loading = false;
      $scope.error = true;
    });
  };

  $scope.connect = function (device) {
    $scope.connecting = true;
    $scope.loading = true;
    $http.get(device.url + '/api/abode/status').then(function (response) {
      $scope.loading = false;
      $scope.error = false;
      $scope.device.name = response.data.name;
      $scope.device.config = {
        'address': response.data.url
      };
      $scope.device.capabilities = response.data.capabilities;
      console.log(response.data);
    }, function (err) {
      $scope.loading = false;
      $scope.error = true;
    });
  };

  $timeout($scope.load, 100);
}]);
