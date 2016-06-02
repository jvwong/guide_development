#!/usr/bin/env bash
#
#### Stop containers, delete them, then get rid of dangling images.
docker stop $(docker ps -aq)
docker rm -v $(docker ps -aq)

#### Get rid of dangling volumes
#### use docker 'rm -v' when deleting containers OR
#### add the --rm flag with 'docker run'
#docker volume rm $(docker volume ls -fq dangling=true)
#docker volume rm $(docker volume ls -aq)

## remove stopped containers
#docker rm -v $(docker ps -aq -f="exited=0")
#docker rm -v $(docker ps -aq -f="exited=1")

#### Remove dangling images
docker rmi $(docker images -f "dangling=true" -q)
#docker rmi $(docker images -q)