import sqlite3

conn = sqlite3.connect('ifai/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d9c11943fc7443dce3c8a287b9a024b432edf4058a5d03bc3559c0b3f9c3269c.sqlite')
cursor = conn.cursor()
# cursor.execute("""CREATE TABLE chats(
#     uid1 TEXT,
#     uid2 TEXT,
#     id INTEGER UNIQUE
# )""")
# cursor.execute("""ALTER TABLE chats ADD time INTEGER""")
# cursor.execute('UPDATE users SET password="Teste*123"')
# cursor.execute("""DELETE FROM chats""")
# conn.commit()
# cursor.execute("""DELETE FROM friends""")
# cursor.execute("""ALTER TABLE friends ADD time INTEGER""")
# cursor.execute("UPDATE users SET nFriends=1 WHERE name='Questão Response2'")
# cursor.execute("""CREATE TABLE messages(
#     text TEXT,
#     uid TEXT,
#     visualized INTEGER,
#     type INTEGER,
#     time INTEGER,
#     chat_id INTEGER,
#     id INTEGER UNIQUE
# )""")
cursor.execute("""ALTER TABLE communities ADD banner TEXT""")
# cursor.execute("""CREATE TABLE communities(
#     description TEXT,
#     id INTEGER UNIQUE,
#     image TEXT,
#     name TEXT,
#     members TEXT,
#     owner TEXT,
#     privacy INTEGER,
#     timestamp INTEGER
# )""")
conn.commit()
cursor.execute("SELECT * FROM communities")
for row in cursor.fetchall():
    print(row)

conn.close()
   