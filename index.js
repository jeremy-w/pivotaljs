'use strict';

var request = require('request'),
	_ = require('underscore'),
	querystring = require('querystring'),
	fs = require('fs'),
	path = require('path'),
	Pivotal;

/**
 * Pivotal constructor
 * @param {String} [apiToken] API token generated from Pivotal
 */
Pivotal = function Pivotal(apiToken) {
	this.apiToken = apiToken;
	this.baseUrl = 'https://www.pivotaltracker.com/services/v5/';
};

/**
 * Update a Pivotal Story
 * @param  {String}   projectId Pivotal project id
 * @param  {String}   storyId   Pivotal story id
 * @param  {Object}   [params]  Extra parameters
 * @param  {Function} [callback]  function(error, response)
 */
Pivotal.prototype.updateStory = function updateStory(projectId, storyId, params, callback) {
	this.api('put', 'projects/' + projectId + '/stories/' + storyId, {
		json: params
	}, callback);
};

/**
 * Obtains a Pivotal Story
 * @param  {String}   storyId   Pivotal story id
 * @param  {Function} [callback]  function(error, response)
 */
Pivotal.prototype.getStory = function getStory(storyId, callback) {
	this.api('get', '/stories/' + storyId, {}, callback);
};

Pivotal.prototype.getProjects = function getProjects(callback) {
	this.api('get', '/projects', {}, callback);
};

/**
 * Get paginated stories from Pivotal project
 * @param  {String}   projectId   Pivotal project id
 * @param  {Object}   [options]   Extra parameters
 * @param  {Function} [callback]  function(error, stories, pagination, nextPage)
 * @param  {Function} [completed] function(error)
 * @param  {Integer}  [offset]    Initial pagination offset
 * @param  {Integer}  [limit]     Pagination limit for each response
 */
Pivotal.prototype.getStories = function getStories(projectId, options, callback, completed, offset, limit) {
	this.paginated('projects/' + projectId + '/stories', offset || 0, limit || 128, options, callback, completed);
};

Pivotal.prototype.getActivity = function getActivity(projectId, options, callback, completed, offset, limit) {
	this.paginated('projects/' + projectId + '/activity', offset || 0, limit || 128, options, callback, completed);
};

Pivotal.prototype.getStoryActivity = function getStoryActivity(projectId, storyId, callback, options) {
	this.api('get', 'projects/' + projectId + '/stories/' + storyId + '/activity', {
		qs: options || {}
	}, callback);
};

Pivotal.prototype.getMyActivity = function getMyActivity(callback, options) {
	this.api('get', 'my/activity', {
		qs: options || {}
	}, callback);
};

/**
 * Get tasks from Pivotal story
 * @param  {String}   projectId Pivotal project id
 * @param  {String}   storyId   Pivotal story id
 * @param  {Function} [callback]  function(error, tasks)
 */
Pivotal.prototype.getTasks = function getTasks(projectId, storyId, callback) {
	this.api('get', 'projects/' + projectId + '/stories/' + storyId + '/tasks', {}, callback);
};

Pivotal.prototype.getIterations = function getIterations(projectId, options, callback, completed, offset, limit) {
	this.paginated('projects/' + projectId + '/iterations', offset || 0, limit || 128, options, callback, completed);
};

/**
 * Get current iteration stories from Pivotal project
 * @param  {String}   projectId projectId Pivotal project id
 * @param  {Function} callback  [description]
 * @return {[type]}             [description]
 */
Pivotal.prototype.getCurrentIterations = function(projectId, callback) {
	this.api('get', 'projects/' + projectId + '/iterations', {
		qs: {
			scope: 'current',
			date_format: 'millis'
		}
	}, function(err, iterations) {
		if (_.isFunction(callback)) {
			if (err || !iterations) {
				callback(err);
			} else {
				callback(false, iterations);
			}
		}
	});
};

Pivotal.prototype.getMemberships = function updateStory(projectId, callback) {
	this.api('get', 'projects/' + projectId + '/memberships', {}, callback);
};

/**
 * Get comments from Pivotal story
 * @param  {String}   projectId Pivotal project id
 * @param  {String}   storyId   Pivotal story id
 * @param  {Function} [callback]  function(error, comments)
 */
Pivotal.prototype.getComments = function getStories(projectId, storyId, callback) {
	this.api('get', 'projects/' + projectId + '/stories/' + storyId + '/comments', {}, callback);
};

/**
 * Export stories from Pivotal
 * @param  {String[]}  stories   List of story id's
 * @param  {Function}  [callback]  function(error, response)
 */
Pivotal.prototype.exportStories = function exportStories(stories, callback) {
	this.api('post', 'stories/export', {
		body: querystring.stringify({
			'ids[]': stories
		})
	}, callback);
};

/**
 * Post attachment to Pivotal story
 * @param  {String}   projectId Pivotal project id
 * @param  {String}   storyId   Pivotal story id
 * @param  {String}   filepath  Path of attachment
 * @param  {String}   type      Content type of attachment
 * @param  {String}   comment   Comment text
 * @param  {Function} [callback]  function(error, response)
 */
Pivotal.prototype.postAttachment = function postAttachment(projectId, storyId, filepath, type, comment, callback) {
	var that = this;
	fs.readFile(filepath, function(err, contents) {
		request.post({
			url: "https://www.pivotaltracker.com/services/v5/projects/" + projectId + "/uploads",
			multipart: [{
				"Content-Disposition": "form-data; name=\"file\"; filename=\"" + path.basename(filepath) + "\"",
				"Content-Type": type,
				"body": contents
			}],
			headers: {
				"X-TrackerToken": that.apiToken
			}
		}, function(err, res, upload) {
			if (err || upload.kind == 'error') {
				callback(err, {
					success: false,
					error: upload ? upload.error + ' (' + upload.general_problem + ')' : err
				});
			} else {
				that.api('post', 'projects/' + projectId + '/stories/' + storyId + '/comments', {
					json: {
						text: comment,
						file_attachments: [JSON.parse(upload)]
					}
				}, callback);
			}
		});
	});
};

/**
 * Get all labels in Pivotal project
 * @param  {String}   projectId Pivotal project id
 * @param  {Function} [callback]  function(error, labels)
 */
Pivotal.prototype.getLabels = function getLabels(projectId, callback) {
	this.api('get', 'projects/' + projectId + '/labels', {}, callback);
};

/**
 * Create Pivotal label
 * @param  {String}   projectId Pivotal project id
 * @param  {[type]}   name      Name of label
 * @param  {Function} [callback]  function(error, label)
 */
Pivotal.prototype.createLabel = function createStory(projectId, name, callback) {
	this.api('post', 'projects/' + projectId + '/labels', {
		body: {
			name: name
		}
	}, callback);
};

/**
 * Create new Pivotal story
 * @param  {String}   projectId Pivotal project id
 * @param  {Object}   [params]  Story parameters
 * @param  {Function} [callback]  function(error, story)
 */
Pivotal.prototype.createStory = function createStory(projectId, params, callback) {
	this.api('post', 'projects/' + projectId + '/stories', {
		body: params
	}, callback);
};

Pivotal.prototype.paginated = function(path, offset, limit, options, callback, completed) {
	var that = this;
	this.api('get', path, {
		qs: _.extend({
			offset: offset,
			limit: limit,
			envelope: true
		}, options)
	}, function(err, res) {
		if (err || !res.pagination) {
			completed && completed(err || res);
		} else {
			offset += res.pagination.returned;
			callback && callback(null, res.data, res.pagination, function(cont) {
				if (cont) {
					var left = res.pagination.total - offset;
					if (left > 0) {
						that.paginated(path, offset, Math.min(left, limit), options, callback, completed);
					} else {
						completed && completed();
					}
				} else {
					completed && completed();
				}
			});
		}
	});
};

Pivotal.prototype.api = function api(method, path, options, callback) {
	var opts = _.extend({
		method: method,
		url: this.baseUrl + path,
		json: true,
		headers: {
			'X-TrackerToken': this.apiToken
		}
	}, options);
	request(opts, function(err, response, result) {
		if (_.isFunction(callback)) {
			callback(err, result);
		}
	});
};

module.exports = Pivotal;