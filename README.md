# Cube Fortress

Browser based MMO game with map drawing for changing classes and spawning an energy drink that boosts speed. Inspired on Pixel Canvas and Team Fortress.

In order to change classes, you can use the "place" button to draw three masks of characters: Engineer, soldier and scout. The engineer can turn himself into a huge tower that fires explosive projectiles precisely wherever the player clicks. The soldier fires a bazooka round which explodes on impact or after traveling a bit. The scout is fast and fires a special projectile further away. Bonus: You can draw a famous energy drink can to gain a speed boost for 10 seconds.

The list of draw-able characters is in the game logo. You can also draw anything else you want with the available colors.

Cause as much player damage as you can before each match ends.

More details on how to run it and an updated description will be available in https://github.com/JooJ-Joestar/ggj-cube-game

Client was developed using Babylon.JS and server was developed using Colyseus.js, and AWS EC2 was used for storing and running both during the play test at PUCPR.

Reach out to me through my LinkedIn if you'd like to :) https://www.linkedin.com/in/joojdev/

## Instructions
- Install the most recent version of Node.js and NPM
- In the root directory, create a file named .env and place the contents from .env.example in it. Change the values as you need and/or want
- In the server directory, change the .env.development values if needed. You can increase or decrease the pause time between matches and match duration in it
- Run `npm install` in the root folder and in the server folder
- Run `npm run start` both in the root folder and in the server folder. The game client should be accessible through http://localhost:8080. The game server through either port 2567 or 2568.
- Whenever a .env file is changed, I recommend you to stop both client and server and rerun the `npm run start` command
