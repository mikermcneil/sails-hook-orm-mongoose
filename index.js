/**
 * Module dependencies
 */

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');



/**
 * @param  {SailsApp} sails
 * @return {Dictionary}
 */
module.exports = function (sails) {

  /**
   * Hook definition
   */
  return {


    /**
     * defaults
     *
     * The implicit configuration defaults merged into `sails.config` by this hook.
     *
     * @type {Dictionary}
     */
    defaults: {

      globals: {
        models: true
      },

      // Mongoose-specific config
      mongoose: {

        // The default Mongo connection URI to use when communicating with the Mongo database for every one of
        // this app's models. By default, uses the database: "my_sails_app"
        // For more about the connection string, see: https://docs.mongodb.org/manual/reference/connection-string/
        uri: 'mongodb://localhost/my_sails_app',

        // These optional connection options are passed in to mongoose when `.connect()` is called.
        // See http://mongoosejs.com/docs/connections.html for a full list of available options.
        connectionOpts: {}

      }

    },



    /**
     * configure()
     *
     * @type {Function}
     */
    configure: function() {

      // Validate `sails.config.globals.models`
      if ( _.isObject(sails.config.globals) && !_.isBoolean(sails.config.globals.models) ) {
        throw new Error(
          'If provided, `sails.config.globals.models` must be either `true` or `false`.\n'+
          'If `true`, instantiated Mongoose models will be exposed as global variables.'
        );
      }

      // Validate `sails.config.mongoose.uri`
      if ( !_.isString(sails.config.mongoose.uri) ) {
        throw new Error(
          'Expected Mongo connection URI (a string) to be provided as `sails.config.mongoose.uri`, but the provided Mongo URI is invalid.\n'+
          'See https://docs.mongodb.org/manual/reference/connection-string/ for help.'
        );
      }

      // Validate `sails.config.mongoose.connectionOpts`
      if ( !_.isObject(sails.config.mongoose.connectionOpts) || _.isArray(sails.config.mongoose.connectionOpts) ) {
        throw new Error(
          'If provided, `sails.config.mongoose.connectionOpts` must be a dictionary of additional options to pass to Mongoose.\n'+
          'See http://mongoosejs.com/docs/connections.html for a full list of available options.'
        );
      }

    },



    /**
     * initialize()
     *
     * @param  {Function} cb
     */
    initialize: function(cb) {

      // Connect to the configured database using Mongoose.
      // (note that there is no callback:  this seems to be ok though.  Mongoose docs state that operations begun before
      //  a connection is established will be queued and replayed.)
      mongoose.connect(sails.config.mongoose.uri, sails.config.mongoose.connectionOpts);

      // Expose `sails.mongoose` for convenience.
      sails.mongoose = mongoose;

      // Load model definitions using the module loader.
      // Returned `modules` are case-insensitive, using filename to determine identity.
      // (This calls out to the `moduleloader` hook, which uses `sails-build-dictionary` and `includeall`
      //  to `require` and collate the relevant code for these modules-- also adding the appropriate `globalId`
      //  property.)
      sails.log.verbose('Loading the app\'s models from `%s`...', sails.config.paths.models);
      sails.modules.loadModels(function modulesLoaded(err, modules) {
        if (err) return cb(err);

        // Instantiate models and expose references to them as `sails.models.*`.
        // (i.e. `sails.models[identity]`)
        sails.models = modules;

        console.log(modules);

        // If configured to do so, also expose instantiated models as global variables.
        // (using `globalId` to expose these models process-wide)
        if ( _.isObject(sails.config.globals) && sails.config.globals.models ) {
          _.each(sails.models, function eachInstantiatedModel(Model, identity) {
            // Ensure a `globalId` exists (if not, make one up)...
            sails.models[modelId].globalId = sails.models[modelId].globalId || _.capitalize(sails.models[modelId].identity);
            // Then expose the Model as a global variable.
            global[globalId] = Model;
          });
        }

        return cb();
      });


    },//</initialize>


  };//</return hook definition>
};//</module.exports>
