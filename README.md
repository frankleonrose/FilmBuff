# Film Buff
Replicates (in a small way) the in-built Alexa skill that answers the question what film starred both actor1 and actor2?

Funny story. I'm all amazed at how I don't see this as a skill to add in the skill gallery. I spend 14 hours over the course of a few days putting it together thinking, wow, this is going to be very cool. Then while I'm testing, I ask Alexa "What film stars both Uma Thurman and John Travolta." She answers with 3 movies. Then in my test code I'm seeing only one answer (Plup Fiction). Turns out, this functionality is built in to Alexa already. I was asking the built in service, not my own, which would have required me to ask "Alexa, ask Film Buff what film starred...". Doh!

Knowning what I know now, I understand some of the problems Alexa had parsing my questions when I tried calling the skill "What Film". I wanted to be able to say, "Ask What Film starred...". She couldn't parse that, because it was conflicting with her existing set of inherent skills.

Among other things I learned:

 - Creating an utterance file needs to be generalized. I should be able to express at the very least a set of synonyms [film, movie, flick] and have some code generate all the utterances containing them.
 - Debugging Lambda functions when the zip file is big (it's big because it contains the movie database files) is tricky. Can't use the Lambda editor and the CloudWatch logs don't tell you the line number where a module fails to parse. I ended up pasting single code files into a different Lambda function in order to be able to view parse errors.
 - Javascript is not great for the kind of scripting I did in generate.js. I should have used Python or at least stuck to Sync functions only.
 - Never embed an API key into code, even when you're just doing something quickly to start. You're going to forget it is there and commit and then it's out there.
 
## Rewrite
I revamped this sample to demonstrate my take on the architecture of an Alexa app. See [Alexa Skill Architecture](http://futurose.com/coding/2016/01/22/alexa-skill-architecture.html) post.
 
## How To
 - npm run generate - Downloads movie information from TMDB.org and creates database files and a name.list file to define Alexa skill's ACTOR_NAME type.
 - npm run test - Tests some basic functions.
 - npm run package - Creates dist/lambda.zip ready to upload to a Lambda function.
 
 - Configure Lambda function with dist/lambda.zip code code.
 - Configure an Alexa skill using schema.json and utterances.txt files and point to Lambda function ARN

## Attribution
 - Thanks to The Movie Database (themoviedb.org) for supplying lots of free and easy to access movie data.
 - https://github.com/cavestri/themoviedb-javascript-library/ (which I modified to be usable within Node)
 
## License
The MIT License (MIT)

Copyright (c) 2015 Frank Leon Rose

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE
