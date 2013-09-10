tsc server.ts --module "commonjs"
screen -S TSServer -X quit
screen -dmS TSServer node server