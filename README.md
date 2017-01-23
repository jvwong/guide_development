# guide_development

This remote provides a collections of tools that support development of the [Pathway Commons Guide](http://pathwaycommons.github.io/guide/) which contains a Jekyll github pages [site](https://github.com/PathwayCommons/guide).

Briefly, the code for the Guide is nested as a subtree inside this repo. It is built and pushed directly to the gh-pages branch where it can be served by GitHub Pages. This repo contains a multitude of tools to support development including:

  - R Markdown file processing and copying
	- Watch for file changes and autoreload of the browser
	- CSS and JavaScript file processing

## Getting started

The following section describes how to get the site running locally. The versions are those that are known to play nice. Mileage may vary with other versions.

### Software Requirements
- [x] [Git](https://git-scm.com/)
- [x] [Jekyll](https://jekyllrb.com/docs/installation/) (3.1.6)
- [x] [Python](https://www.python.org/download/releases/2.7/) (2.7)
- [x] [Node](https://nodejs.org/en/) (0.10.26)
- [x] [R](https://www.r-project.org/) (3.2.3)
- [x] [Fabric](http://www.fabfile.org/) (1.11.1)

### Run the site

1. Clone this remote using git

	``` shell
		$ git clone https://github.com/jvwong/guide_development
		$ cd guide_development
	```

2. Install dependencies

	``` shell
	  $ npm install && bower install
	```

2. Run the app using a NPM script

	``` shell
	  $ npm run dev
	```

This should build the necessary files inside `src` and copy them over into the `guide` parent directory. It should open a browser to [http://localhost:8080/](http://localhost:8080/) automatically when done where you should see the site.

## Build

There's a lot going on underneath the hood to get this site going but it breaks down into four categories:

1. Collection content written in R Markdown is processed to regular markdown
2. JavaScript is processed
3. Styling (SASS) is processed
4. Markdown is built by Jekyll into pure HTML

The raw files are placed in the `src` folder which is read in by the [Gulp](http://gulpjs.com/) script and processed accordingly. Style and scripts are sent to the `guide/public` directory. Markdown for collections are house directly under `guide` and this is where Jekyll takes over to build the site.

### Using Gulp

The [gulpfile.js](https://github.com/jvwong/guide_development/blob/master/gulpfile.js) contains tasks for building and watching all static assets including processing [R Markdown](http://rmarkdown.rstudio.com/) files. Browser auto-reload on file changes is enabled via [browserSync](https://www.browsersync.io/).

### Deploy

Use the wonderful [Fabric](http://www.fabfile.org/) instructions inside `fabfile.py` to deploy to GitHub Pages.

``` shell
$ fab deploy:message="This is the latest git commit message"
```

This will automatically commit any changes in the *Guide* repo subtree, trigger a Jekyll build, then push the built site directly to the GitHub origin branch `gh-pages`. In this way the site [`https://pathwaycommons.github.io/guide`](http://pathwaycommons.github.io/guide/) will be directly available for viewing.
