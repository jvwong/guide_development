### *************************************************************************###
### ************************* REMOTE ROUTINES *******************************###
### *************************************************************************###
from __future__ import with_statement
from fabric.contrib.files import exists, sed
from fabric.api import env, local, run, settings, abort
from fabric.contrib.console import confirm

import os

APP_NAME = "guide"
BASE_DIR = os.path.dirname(os.path.realpath(__file__))

### *************************************************************************###
### ******************** BEGIN DEPLOYMENT ***********************************###
### *************************************************************************###

### Run with `$ fab deploy:message="This is a commit"`
def deploy(*args, **kwargs):

    print("Building...")
    _lbuild()

    print("Commit to master with message '%s'" % kwargs['message'])
    _lgitcommit(kwargs['message'], branch='master')

    print("Pushing to gh-pages...")
    _lgitpush()

    # print("Tagging this as LIVE...")
    # _lgittag()

    print("Done")

def _lbuild( environment='production' ):
    local('cd guide && JEKYLL_ENV=%s jekyll build' % (environment,))

def _lgitcommit(message='update `date +COMMIT-%F/%H%M`', branch='master'):
    with settings(warn_only=True):
        result = local('cd guide && git add . && git commit -am "%s"' % (message,))
    if result.failed and not confirm("No commits to make. Continue anyway?"):
        abort("Aborting at user request.")

def _lgitpush():
    local('cd guide && git push origin master')
    local('cd guide && git subtree push --prefix _site origin gh-pages')

def _lgittag():
    local('cd guide && git tag -f LIVE')
    local('cd guide && export TAG=`date +DEPLOYED-%F/%H%M` && git tag $TAG && git push -f origin $TAG')
### *************************************************************************###
### ************************* END DEPLOYMENT ********************************###
### *************************************************************************###
