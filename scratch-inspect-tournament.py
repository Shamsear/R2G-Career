import os
import psycopg2
from dotenv import load_dotenv

# Load env variables
load_dotenv('.env.local')

# Use NEON_TOURNAMENT_DB_URL
DATABASE_URL = os.getenv('NEON_TOURNAMENT_DB_URL')

if not DATABASE_URL:
    print("NEON_TOURNAMENT_DB_URL not found in env.")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Get columns of managers
    cursor.execute("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'managers'
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    print("TOURNAMENT DB MANAGERS COLUMNS:")
    for col in columns:
        print(f"  {col[0]}: {col[1]} (nullable: {col[2]})")
        
    # Get a sample row
    cursor.execute("SELECT * FROM managers LIMIT 1;")
    row = cursor.fetchone()
    if row:
        colnames = [desc[0] for desc in cursor.description]
        print("SAMPLE ROW:")
        for colname, val in zip(colnames, row):
            print(f"  {colname}: {val}")
    else:
        print("No rows found in managers table of tournament DB.")
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {str(e)}")
