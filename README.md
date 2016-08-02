# Pathway Commons Guide Development

This is the repository intended for local development of the [Guide repository](https://github.com/jvwong/guide) which contains a Jekyll github pages [site](https://jvwong.github.io/guide/).

## Getting started
The following section describes how to get the site running locally. The versions are those that are known to play nice. Mileage may vary with other versions.

### Requirements
- [x] [Git](https://git-scm.com/)
- [x] [Jekyll](https://jekyllrb.com/docs/installation/) (3.1.6)
- [x] [Python](https://www.python.org/download/releases/2.7/) (2.7)
- [x] [Node](https://nodejs.org/en/) (0.10.26)
- [x] [R](https://www.r-project.org/) (3.2.3)

### Optional
- [ ] [Docker](https://docs.docker.com/engine/installation/) (1.10.1)
- [ ] [Docker-Compose](https://docs.docker.com/compose/install/) (1.7.0rc1)
- [ ] [Fabric](http://www.fabfile.org/) (1.11.1)

### Using Git
Since we include the Guide Jekyll site as a submodule, we'll need to take care to properly clone the repository and version any changes.

#### Clone the Jekyll repository
Clone this repository onto your machine:

``` shell
	$ git clone --recursive https://github.com/jvwong/guide_development
	$ cd guide_development
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

## Development
### Using Gulp
The [gulpfile.js](https://github.com/jvwong/guide_development/blob/master/gulpfile.js) contains tasks for building and watching all static assets including processing [R Markdown](http://rmarkdown.rstudio.com/) files. Browser auto-reload on file changes is enabled via [browserSync](https://www.browsersync.io/).

#### Build and Run
When inside the parent directory, to build assets and launch the application server, simply type:

```shell
 $ npm install
 $ gulp
```  

Point your browser at  `http://localhost:8080/`. Note that the app is served from root and not the `baseurl`.

### Deploying to https://pathwaycommons.github.io/guide
Use the convenient fabric configuration file to launch a new deploy to the server:

``` shell
$ fab deploy:message="This is the latest git commit message"
```

This will automatically commit any changes in the *Guide* submodule, push them to the GitHub origin branch `gh-pages` which will trigger an immediate build for display at `https://pathwaycommons.github.io/guide`.
