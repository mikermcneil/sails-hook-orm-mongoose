# sails-hook-orm-mongoose

An example override for the `orm` hook in Sails.  Loads and instantiates your model files as Mongoose models instead of Waterline models.

The purpose of this repo is twofold: on one hand, this hook aims to provide an easy way to replace Waterline support in Sails with a generic Mongoose setup for Sails users who have that use case.  But the primary goal of this repo is to provide a complete example of how to override any core hook in Sails-- in this case, specifically the ORM hook.

The source code in this repo sets up conventions for how to go about:
 - defining and namespacing your own configuration
 - choosing where and where not to overlap with Sails core features/config/methods
 - playing nicely with other core hooks
 - and best practices for documentation; including declaring your override's dependencies/dependents, its configuration, and the public properties/methods it exposes on the `sails` app instance.



> #### IMPORTANT
> This is **not** a drop-in replacement for the default ORM hook.  Unless you are a **relatively advanced Sails user who _is already using Mongoose_**, you should avoid using this package and opt to take advantage of the built-in support for Waterline.  The Waterline ORM is actively maintained by our core team, and is being used in production on projects large and small throughout the world.
>
> That said, if you choose to use this hook to override Waterline (the built-in ORM in Sails), realize that the documentation for blueprints, resourceful pubsub, models, adapters, connections, Waterline, etc. in Sails will be _no longer be applicable_ for your app!
> Furthermore, please understand that this hook is an _example_, and is not a part of the Sails project proper.  This hook is stable and ready to use; and we will do our best to merge patches fixing confusing documentation or bugs (and we'd welcome a contribution with tests!!).  However, be aware that the core team's focus is on Waterline, so additional features and enhancements for this example will not be part of the Sails project's roadmap any time in the forseeable future-- any work in that department is up to you.


## Installation

From your Sails app:

```bash
npm install sails-hook-orm-mongoose --save
```

That's it!.... almost.  For the time being, you also need to disable the ORM hook.  To do so, merge the following into your `.sailsrc` file:

```json
{
  "hooks": {
    "orm": false,
    "pubsub": false,
    "blueprints": false
  }
}
```


## Compatibility

#### Needs...

The following core hooks **must be enabled**, in order for this hook to work properly:

- moduleloader _(enabled by default)_
- userconfig _(enabled by default)_


#### Must disable...

In order to use this hook, you **must** disable the following core hooks in your Sails app:

- blueprints
- pubsub


## Usage

#### Defining models

This hook loads model definitions according to standard Sails conventions, relying on the core `moduleloader` hook (i.e. usually from `api/models/*.js`).
The model definition must export a dictionary. If a `schema` property is specified, it must also be a dictionary, and it will be passed in as an argument to Mongoose's Schema constructor.
For example, to build a Sails model equivalent to [this example from the Mongoose docs](http://mongoosejs.com/docs/guide.html#definition):

```javascript
/**
 * Blog (model)
 *
 * Usage:
 * • `Blog`  _(global)_
 * • `sails.models.blog`
 *
 * @definition
 *   @source `api/models/Blog.js`
 *   @type {Dictionary}
 */
module.exports = {

  schema: {
    title:  String,
    author: String,
    body:   String,
    comments: [{ body: String, date: Date }],
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
      votes: Number,
      favs:  Number
    }
  },

};
```

Once the hook "new"s up the `schema` you provided into a Schema instance, that Schema instance is then used to create a Model (using `mongoose.model(...)`).
Refer to [the Mongoose docs](http://mongoosejs.com/docs/guide.html) for available model methods such as `.find()` and `.create()`.  If any of the terminology in this README sounds unfamiliar, you should give the Mongoose "Getting Started" guide a thorough read before proceeding.



#### Customizing a Schema

If you need to customize how the Schema or Model instance is built, you may pass in a `constructSchema` and/or a `constructModel` interceptor function as part of your model definition.

Let's return to our `Blog` model for an example:

```javascript
// ...
module.exports = {

  schema: {
    title:  String,
    author: String,
    body:   String,
    comments: [{ body: String, date: Date }],
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
      votes: Number,
      favs:  Number
    }
  },



  /**
   * constructSchema()
   *
   * Note that this function must be synchronous!
   *
   * @param  {Dictionary} schemaDefinedAbove  [the raw schema defined above, or `{}` if no schema was provided]
   * @param  {SailsApp} sails                 [just in case you have globals disabled, this way you always have access to `sails`]
   * @return {MongooseSchema}
   */
  constructSchema: function (schemaDefinedAbove, sails) {
    // e.g. we might want to pass in a second argument to the schema constructor
    var newSchema = new sails.mongoose.Schema(schemaDefinedAbove, { autoIndex: false });

    // Or we might want to define an instance method:
    newSchema.method('meow', function () {
      console.log('meeeeeoooooooooooow');
    });

    // Or a static ("class") method:
    newSchema.static('findByName', function (name, callback) {
      return this.find({ name: name }, callback);
    });

    // Regardless, you must return the instantiated Schema instance.
    return newSchema;
  }

};
```

As you can see, this allows you to make many exciting customizations to your models. More on that [in the Mongoose docs about "schemas"](http://mongoosejs.com/docs/guide.html#definition).



#### Connecting

When this hook loads, it automatically connects to the configured Mongo URI (see the **Configuration** section below).  All of your models share this Mongo URI by default.


###### Advanced: Additional connections

If you need to change this, or make additional connections, use `sails.mongoose` directly to do so in your `config/bootstrap.js` file (or for the most flexibility, fork this hook and copy the folder into your project as `api/hooks/orm`, update your package.json to include its dependencies, then edit the hook's `initialize` function and have it do whatever you like).


###### Advanced: Accessing the `mongoose` object directly

This hook exposes the `mongoose` object you get from running `require('mongoose')` directly on the `sails` app instance.  This allows you to use mongoose from anywhere in your Sails app without having to call `require('mongoose')` (and reflects the fact that the `mongoose` you require retains global state).

For example:

```javascript
var conn = sails.mongoose.createConnection(..);
// ...etc.
```

> Note that the only way to prevent this hook from connecting to Mongo automatically when it loads is to _fork it_.  As stated above, this hook is designed to be an _example_-- customize it however you like!


## Configuration

This hook uses the following properties on `sails.config`:


| Property                                       | Type           | Default                               | Details
|------------------------------------------------|:--------------:|:--------------------------------------|:-----------------|
| `sails.config.mongoose.uri`                    | ((string))     | `'mongodb://localhost/my_sails_app'`  | The Mongo connection URI to use when communicating with the Mongo database for any of this app's models.
| `sails.config.mongoose.connectionOpts`         | ((dictionary)) | `{}`                                  | This optional configuration is a dictionary of additional options to pass in to mongoose when `.connect()` is called. See http://mongoosejs.com/docs/connections.html for a full list of available options.
| `sails.config.globals.models`                  | ((boolean))    | `true`                                | Whether or not to expose each of your app's models as global variables (using their **globalId**). If this setting is disabled, you can still access your models via `sails.models.*`.  E.g. a model defined in `api/models/User.js` would have a globalId of `User` by default.




## FAQ


#### What is this?

This repo contains an override for the core `orm` hook.  It replaces built-in Waterline support with some basic affordances for using Mongoose with Sails.


#### Is there an example app somewhere?

[You bet](https://github.com/mikermcneil/orm-hook-override-example)!


#### If I want to use Mongoose, do I _have_ to use this hook?

No way!  First of all, you can _always_ use any NPM package you like in your Sails app, regardless of what hooks are installed (just `require()` the module like you would from any Node app).
Specifically, as an alternative to using this hook, you can just disable the core ORM hook, then define your Mongoose collections in the `api/models/` folder, set up Mongoose and require your collection definitions in `config/bootstrap.js`, and expose those instantiated models however you like. To go with this approach and disable the ORM hook, just merge the following JSON into your project's `.sailsrc` file:

```json
{
  "hooks": {
    "orm": false,
    "pubsub": false,
    "blueprints": false
  }
}
```


#### I need this module to do...

This is an example of how to override the ORM hook.  If you would like to extend it, tweak the way it is configured, or otherwise change it in any way, go for it!  Just fork this repo and bring it into your project as an app-level hook `api/hooks/orm/` or maintain it as a separate package and develop it alongside your app with `npm link`.

If you have a version of this hook that you are maintaining and using in production, and you think it would be helpful to others, then please first ensure that you've written some tests and (even more important) complete documentation of how to install and use it in a brand new project.  Then if you [publish your hook](http://sailsjs.org/documentation/concepts/extending-sails/hooks/installable-hooks#?publishing-your-hook) on NPM and contact someone on the [Sails core team](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md#viii-core-maintainers), we will help ensure the rest of the Sails community hears about it.



## License

MIT
