var notifications = angular.module('abode.notifications', ['ngResource']);

notifications.factory('Notifications', ['$resource', '$http', '$q', '$uibModal', 'abode', function ($resource, $http, $q, $uibModal, abode) {

  var model = $resource(abode.url('/api/notifications/:id/:action'), {id: '@_id'}, {
    'update': { method: 'PUT' },
    'refresh': { method: 'GET' },
    'active': { method: 'GET', isArray: true, params: {'id': 'active'} },
  });

  model.prototype.$deactivate = function () {
    var self = this,
      defer = $q.defer(),
      url = abode.url('/api/notifications/' + this._id + '/deactivate').value();

    $http.post(url).then(function () {
      defer.resolve(self);
    }, function (err) {
      defer.reject(err.data);
    });

    return defer.promise;
  };

  return model;

}]);

notifications.directive('notifications', [function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      'view': '@'
    },
    controller: ['$rootScope', '$scope', '$interval', '$q', 'abode', 'Notifications', function ($rootScope, $scope, $interval, $q, abode, Notifications) {
      $scope.notifications = [];
      $scope.loader = false;
      $scope.loading = false;
      $scope.error = false;

      $scope.dismissAll = function () {
        var defers = [];

        $scope.notifications.forEach(function (notification) {
          defers.push(notification.$deactivate());
        });

        $q.all(defers).then(function () {
          $scope.refresh();
        });
      };

      $scope.refresh = function () {
        if ($scope.loading) {
          return;
        }

        $scope.loading = true;

        Notifications.active().$promise.then(function (results) {
          if (results.length !== 0 && results.length !== $scope.notifications.length) {
            $rootScope.breakIdle();
          }
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

