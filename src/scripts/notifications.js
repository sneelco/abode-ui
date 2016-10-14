var notifications = angular.module('abode.notifications', ['ngResource']);

notifications.factory('Notifications', ['$resource', '$uibModal', 'abode', function ($resource, $uibModal, abode) {

  var model = $resource(abode.url('/api/notifications/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'refresh': { method: 'GET' },
    'active': { method: 'GET', isArray: true, params: {'id': 'active'} },
    'deactivate': { method: 'POST', params: {'action': 'deactivate'}}
  });

  return model;

}]);

notifications.directive('notifications', [function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      'view': '@'
    },
    controller: ['$scope', '$interval', 'abode', 'Notifications', function ($scope, $interval, abode, Notifications) {
      $scope.notifications = [];
      $scope.loader = false;
      $scope.loading = false;
      $scope.error = false;

      $scope.refresh = function () {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;

        Notifications.active().$promise.then(function (results) {
          $scope.loading = false;
          $scope.notifications = results;
        }, function () {
          $scope.loading = false;
        });
      };

      $scope.dismiss = function () {
        $scope.refresh();
      };

      $scope.loader = $interval($scope.refresh, 5000);
      $scope.refresh();

      $scope.$on('$destroy', function () {
        $interval.cancel($scope.loader);
      });
    }],
    templateUrl: 'views/notifications/index.html'
  };
}]);

