var extend = require('extend')
var makeIgnoreNextObject = require('./ignore-changes')
var Bacon = require('baconjs')

module.exports = function makeCollectingStream(options) {
	var observable = options.observable
	var mediator = options.appContext('inside')
	var ignoreNext = makeIgnoreNextObject()
	var mediatorSaveKey = options.mediatorKey

	ignoreNext(options.initialState)

	var upcomingChanges = {}
	var inFlight = false

	function sendChangesToServerIfAppropriate(sink) {
		if (Object.keys(upcomingChanges).length > 0 && !inFlight) {
			sendChangesToServer(sink)
		}
	}

	function sendChangesToServer(sink) {
		var theseChanges = upcomingChanges
		upcomingChanges = {}
		inFlight = true

		mediator.publish(mediatorSaveKey, theseChanges, function(err, changes) {
			inFlight = false
			if (err) {
				sink(new Bacon.Error(err))
				upcomingChanges = {}
			} else {
				ignoreNext(changes)
				sink(changes)
				sendChangesToServerIfAppropriate(sink)
			}
		})
	}

	return Bacon.fromBinder(function(sink) {
		observable.subscribe(function subscriber(event) {
			var changes = ignoreNext.takeIgnoresIntoAccount(event.value())

			extend(upcomingChanges, changes)

			sendChangesToServerIfAppropriate(sink)
		})
	})
}
