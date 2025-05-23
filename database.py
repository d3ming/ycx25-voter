import os
from sqlalchemy import create_engine, Column, Integer, String, Text, MetaData, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json

DATABASE_URL = os.environ["DATABASE_URL"]

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define Company model
class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    url = Column(String)
    description = Column(Text)
    website = Column(String)
    company_linkedin = Column(String, nullable=True)
    founders = Column(Text)  # Store as JSON string
    votes = Column(Integer, default=0)  # Used for ranking
    tier = Column(String, default='C')  # Tier: A, B, C, D (A is best)
    founded_year = Column(String)
    location = Column(String)
    short_description = Column(Text, nullable=True)
    tags = Column(Text, default='[]')  # Store as JSON string array of tags

    def to_dict(self):
        """Convert company to dictionary for API responses"""
        try:
            # Fixed to avoid SQLAlchemy boolean evaluation error
            founders_str = str(self.founders) if self.founders is not None else None
            if founders_str and founders_str.startswith('[') and founders_str.endswith(']'):
                founders = json.loads(founders_str)
            else:
                founders = []
        except:
            founders = []
            
        return {
            "id": self.id,  # Add ID field for API calls
            "name": self.name,
            "url": self.url,
            "description": self.description,
            "website": self.website,
            "company_linkedin": self.company_linkedin,
            "founders": founders,
            "rank": self.votes,  # Keep 'rank' for backward compatibility
            "votes": self.votes,  # Add votes field for consistency
            "tier": self.tier,    # Company tier (A, B, C, D)
            "founded_year": self.founded_year,
            "location": self.location,
            "short_description": self.short_description,
            "tags": json.loads(self.tags) if self.tags and isinstance(self.tags, str) else []
        }

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Initialize database with companies
def initialize_db(companies_data):
    """Initialize database with company data if it doesn't exist already"""
    db = SessionLocal()
    
    # Check if database is already populated
    if db.query(Company).count() > 0:
        db.close()
        return
    
    # Add companies to database
    for company_data in companies_data:
        # Special handling for GroundControl to fix founder display issue
        if company_data['name'] == 'GroundControl' and not company_data.get('founders'):
            # Manually add founders for GroundControl if missing
            company_data['founders'] = [
                {'name': 'Matthew Noseworthy', 'linkedin': 'https://www.linkedin.com/in/matthew-noseworthy-218167106/'},
                {'name': 'Mehul Shah', 'linkedin': 'https://www.linkedin.com/in/mehulmshah22'},
                {'name': 'Nick Warren', 'linkedin': 'https://www.linkedin.com/in/nickcw/'}
            ]
        
        # Convert founders list to JSON string
        founders_json = json.dumps(company_data.get('founders', []))
        
        company = Company(
            name=company_data['name'],
            url=company_data['url'],
            description=company_data['description'],
            website=company_data['website'],
            company_linkedin=company_data.get('company_linkedin'),
            founders=founders_json,
            votes=company_data.get('rank', 0),  # Use 'rank' for backward compatibility
            founded_year=company_data.get('founded_year', 'Unknown'),
            location=company_data.get('location', 'Unknown'),
            short_description=company_data.get('short_description')
        )
        db.add(company)
    
    db.commit()
    db.close()

# Get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()