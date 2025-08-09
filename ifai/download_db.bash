#!/bin/bash

# Exporta dados do banco remoto D1 e cria local SQLite
npx wrangler d1 execute ifai --remote --command=".dump" > dump.sql
sqlite3 dbs/ifai.sqlite < dump.sql
echo "Banco local ifai.sqlite criado com sucesso!"
