# Film Buff
Replicates (in a small way) the in-built Alexa skill that answers the question what film starred both actor1 and actor2?

## How To
 - npm run generate - Downloads movie information from TMDB.org and creates database files and a name.list file to define Alexa skill's ACTOR_NAME type.
 - npm run test - Tests everything.
 - npm run package - Creates dist/lambda.zip ready to upload to a Lambda function.
 
 - Configure Lambda function with dist/lambda.zip code code.
 - Configure an Alexa skill using schema.json and utterances.txt files and point to Lambda function ARN

## Attribution
 - Thanks to The Movie Database (themoviedb.org) for supplying lots of free and easy to access movie data.
 - https://github.com/cavestri/themoviedb-javascript-library/ (which I modified to be usable within Node)