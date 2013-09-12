tsc server.ts --module "commonjs"
tsc --out local/main.js local/main.ts --module "commonjs" 
screen -S TSServer -X quit
screen -dmS TSServer node server