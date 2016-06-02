# Docker Repository for Guide

This is the Docker repository intended for local development of the guide  [repository](https://github.com/jvwong/guide) which contains a Jekyll github pages [site](https://jvwong.github.io/guide/).

## Getting started
The following section describes how to get the site running locally.

### Requirements
- [x] [Docker](https://docs.docker.com/engine/installation/)
- [x] [Docker-Compose](https://docs.docker.com/compose/install/)
- [x] [Git](https://git-scm.com/)

### Using Git
Since we include the Jekyll site as a submodule, we'll need to take care to properly clone the repository and version any changes.

#### Clone the Jekyll repository
Clone this repository onto your machine:

``` shell
$ git clone --recursive https://github.com/jvwong/guide
$ cd guide
```
The `--recursive` flag will pull down our Jekyll site submodule.

#### Versioning updates to the Jekyll site submodule
Back in the main (Docker repo) directory, pull in any new changes from upstream:
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

#### Run it in Docker
This repo uses the official [Jekyll image](https://hub.docker.com/r/jekyll/jekyll/tags/) (v3.1.6) built off a lightweight [Alpine Linux image](https://hub.docker.com/_/alpine/).

```
$ docker-compose up
```

Docker will pull in any images it requires and install any components that you've indicated in the guide repo Gemfile. Point to the correct docker-machine ip, port, and path:

```Shell
$ curl http://`docker-machine ip`:4000/guide/
```
