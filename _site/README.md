# Docker Repository for Guide

This is the Docker repository intended for local development of the   [Guide repository](https://github.com/jvwong/guide) which contains a Jekyll github pages [site](https://jvwong.github.io/guide/).

## Getting started
The following section describes how to get the site running locally.

### Requirements
- [x] [Docker](https://docs.docker.com/engine/installation/)
- [x] [Docker-Compose](https://docs.docker.com/compose/install/)
- [x] [Git](https://git-scm.com/)
- [x] [Node](https://nodejs.org/en/)
- [x] [Fabric](http://www.fabfile.org/)

### Using Git
Since we include the Guide Jekyll site as a submodule, we'll need to take care to properly clone the repository and version any changes.

#### Clone the Jekyll repository
Clone this repository onto your machine:

``` shell
$ git clone --recursive https://github.com/jvwong/guide
$ cd guide
```
The `--recursive` flag will pull down any submodules.

#### Versioning updates to submodules
Back in the main directory, pull in any new changes from upstream:
``` shell
$ git submodule update --remote --merge
```

Now do some work in the submodule:
``` shell
$ cd guide
$ git commit -am "updated readme.md"
$ git push origin gh-pages
```

To ensure that your submodules don't have any outstanding changes before pushing the main repository, just check:
``` shell
$ git status
modified:   guide (new commits, modified content)
```
You'll need to cd into the submodule and do the commit and push there, then push the main repo.

### Docker
#### Run it in Docker
This repo uses the official [Jekyll image](https://hub.docker.com/r/jekyll/jekyll/tags/) (v3.1.6) built off a lightweight [Alpine Linux image](https://hub.docker.com/_/alpine/).

``` shell
$ docker-compose up
```

Docker will pull in any images it requires and install any components that you've indicated in the guide repo Gemfile. Point to the correct docker-machine ip, port, and path:

``` shell
$ curl http://`docker-machine ip`:4000/guide/
```

### Get ready for production
#### Run it in Docker
Run the alternative docker-compose config with the production-related environment variables.

``` shell
$ docker-compose --file=docker-compose-testing.yml up
```

> Note: You might get a 404 for the javascript `babel-compiled.js`. You'll need to compile this before pushing to the server.

#### Compile JSX
We're using [React](https://facebook.github.io/react/) inside the `src/js` directory. In development, these files are served directly and you don't need to do anything.

In production, scripts written in JSX must be transpiled to javascript and placed in the `public/js` directory. You'll need to install the babel-cli library et al.:

``` shell
$ npm install
```

You have three options to compile the JSX files inside the `src/js` directory to the target `public/js`:  

1. You can do this from the command line:
  ``` shell
  $ node_modules/.bin/babel guide/src/js --out-file guide/public/js/babel-compiled.js
  ```
2. Run the npm script
  ``` shell
  $ npm run babel
  ```

### Deploying to https://pathwaycommons.github.io/guide
Just use the fabfile:
``` shell
$ fab deploy="This is the latest git commit message"
```
