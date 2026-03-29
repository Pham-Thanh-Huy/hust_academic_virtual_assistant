import mysql.connector

from app.config.load_env import Env


def init_mysql_db(host, port, user, password, database):
    mydb = mysql.connector.connect(
        host=Env.Mysql.host,
        port=Env.Mysql.port,
        user=Env.Mysql.user,
        password=Env.Mysql.password,
        database=Env.Mysql.database
    )

    return mydb