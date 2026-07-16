import os
import psycopg2
from dotenv import load_dotenv

# Load env variables
load_dotenv('.env.local')

# Connect to SOLO_DATABASE_URL
DATABASE_URL = os.getenv('SOLO_DATABASE_URL')

if not DATABASE_URL:
    print("[Error] SOLO_DATABASE_URL not found in .env.local")
    exit(1)

migration_file = 'migrations/add_r2g_id_to_managers.sql'

if not os.path.exists(migration_file):
    print(f"[Error] Migration file {migration_file} does not exist.")
    exit(1)

try:
    print("Connecting to Solo database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()
    
    print("Checking if r2g_id column already exists...")
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'managers' AND column_name = 'r2g_id';
    """)
    if cursor.fetchone():
        print("[Info] r2g_id column already exists in managers table. Skipping migration.")
        cursor.close()
        conn.close()
        exit(0)
        
    print("Reading migration SQL script...")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_script = f.read()
        
    print("Executing SQL script...")
    cursor.execute(sql_script)
    
    conn.commit()
    print("[Success] Migration executed and committed successfully!")
    
    # Print updated managers to verify
    cursor.execute("SELECT id, name, r2g_id FROM managers LIMIT 10;")
    rows = cursor.fetchall()
    print("\nVerified Managers Sample:")
    for row in rows:
        print(f"  ID: {row[0]}, Name: {row[1]}, R2G ID: {row[2]}")
        
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"[Error] Error during migration: {str(e)}")
    try:
        conn.rollback()
        print("Rollback performed successfully.")
    except Exception as rollback_err:
        print(f"Rollback failed: {str(rollback_err)}")
    exit(1)
