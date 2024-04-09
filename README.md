# guide_development

This remote provides a collections of tools that support development of the [Pathway Commons Guide](http://pathwaycommons.github.io/guide/) which contains a Jekyll github pages [site](https://github.com/PathwayCommons/guide).

Briefly, the code for the Guide is nested as a subtree inside this repo. It is built and pushed directly to the gh-pages branch where it can be served by GitHub Pages. This repo contains a multitude of tools to support development including:

- R Markdown file processing and copying
- Watch for file changes
- CSS and JavaScript file processing
- Development server

## Software Dependencies

This decription was created last using Mac OS: Sonoma 14.1.1. In this case, install or update Xcode (>=v15.3) through the App Store.

### Python

- Set python version
  - [pyenv](https://github.com/pyenv/pyenv)
    - `pyenv install 2.7.18`
- Install dependencies
  - [fabric](https://www.fabfile.org/) (v1.11)

### Ruby & Jekyll

- Install the chruby version manager (v0.3.9)
  - Follow instructions on [Jekyll site](https://jekyllrb.com/docs/installation/macos/) to install Ruby v2.7.8
- Install Jekyll: 4.3.3
  - `gem install jekyll`
  - `cd guide && bundle install`

### R

- Install [R](https://cran.r-project.org/bin/macosx/) (v4.3)
- Install dependencies
  - `install.packages(c("httpuv", "evaluate","jsonlite","knitr","later","magrittr","promises","R6","Rcpp","rlang","servr","xfun", "ggplot2", "gridExtra", "ggplot"))`

### Configure, build and run server

- `gulpfile.js`
  - Point `rMarkdownFileHandler` at path to your R install (e.g. `/Library/Frameworks/R.framework/Versions/<the install ed version>/Resources/Rscript`)
- Install dependencies
  - `nvm use`
  - `npm i`
- Run a local version
  - `npm run dev`

Open your browser to http://localhost:9090

### Run the site

1. Clone this remote using git

	``` shell
		$ git clone https://github.com/jvwong/guide_development
		$ cd guide_development
	```

2. Install dependencies

	``` shell
	  $ npm install
	```

2. Run the app using a NPM script

	``` shell
	  $ npm run dev
	```

This should build the necessary files inside `src` and copy them over into the `guide` parent directory. It should open a browser to [http://localhost:9090/](http://localhost:9090/) automatically when done where you should see the site.

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
