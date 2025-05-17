from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
import pandas as pd
import os
from typing import List, Dict, Any, Optional
import json
import re
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Import database functionality
from database import get_db, Company as DBCompany, create_tables, initialize_db

app = FastAPI(title="YC X25 Batch Explorer")

# Mount static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="templates")

# Model for company data
class CompanyModel(BaseModel):
    name: str
    description: str
    website: str
    rank: int = 0
    url: str
    founders: List[Dict[str, str]]
    founded_year: str
    location: str
    company_linkedin: Optional[str] = None

# CSV data file path
ORIGINAL_CSV = "attached_assets/yc_companies_S25.csv"

# Function to load and process data from CSV
def process_csv_data():
    """Process YC companies data from CSV file"""
    # Process from CSV
    df = pd.read_csv(ORIGINAL_CSV)
    
    # Get unique companies
    companies = {}
    for _, row in df.iterrows():
        company_name = row['Company Name']
        if company_name not in companies:
            companies[company_name] = {
                'name': company_name,
                'url': row['Company URL'],
                'description': row['Company Description'],
                'website': row['Company Website'],
                'founders': [],
                'company_linkedin': None,
                'rank': 0  # Initial votes count is 0
            }
        
        # Process founder data
        if row['Founder Title'] in ['Founder', 'Co-Founder', 'CEO', 'Co-Founder & CEO', 'Co-Founder & CTO']:
            founder_name = row['Founder Name']
            
            # Skip company descriptions that sometimes appear in founder fields
            description_keywords = ["Open-Source", "Faster", "The Co-Pilot", "Vision-first", 
                                   "AI that", "Optimize", "for", "Co-Pilot", "founded", "inc"]
                                   
            # Check if this is an actual founder name and not a description
            is_description = False
            if not isinstance(founder_name, str):
                is_description = True
            elif founder_name == company_name:
                is_description = True
            else:
                for keyword in description_keywords:
                    if isinstance(founder_name, str) and keyword in founder_name:
                        is_description = True
                        break
            
            # Only add if it's an actual founder and not already in the list
            if (not is_description and 
                isinstance(founder_name, str) and 
                founder_name not in [f['name'] for f in companies[company_name]['founders']]):
                companies[company_name]['founders'].append({
                    'name': founder_name,
                    'linkedin': row['Founder LinkedIn']
                })
        
        # Capture company LinkedIn URL
        founder_name = row['Founder Name']
        founder_linkedin = str(row['Founder LinkedIn'])
        if isinstance(founder_name, str) and founder_name == company_name and 'linkedin.com/company' in founder_linkedin:
            companies[company_name]['company_linkedin'] = founder_linkedin
    
    # Extract location and founding year from description
    for company_name, company in companies.items():
        # Parse founded year
        founded_match = re.search(r'Founded in (\d{4})', company['description'])
        company['founded_year'] = founded_match.group(1) if founded_match else 'Unknown'
        
        # Parse location
        location_match = re.search(r'based in ([^,\.]+(?:, [^,\.]+)*)', company['description'])
        company['location'] = location_match.group(1).strip() if location_match else 'Unknown'
        
        # Clean up description - get first sentence
        company['short_description'] = company['description'].split('.')[0] + '.'
    
    # Convert to list of companies
    return list(companies.values())

# Get all companies from database
def get_companies_from_db(db: Session):
    """Get all companies from database"""
    companies = db.query(DBCompany).all()
    return [company.to_dict() for company in companies]

# Get company by name
def get_company_by_name(db: Session, name: str):
    """Get a company by name"""
    return db.query(DBCompany).filter(DBCompany.name == name).first()

# Database setup at startup
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    # Create database tables
    create_tables()
    
    # Process CSV data
    companies_data = process_csv_data()
    
    # Initialize database with company data
    initialize_db(companies_data)

@app.get("/")
async def home(request: Request, db: Session = Depends(get_db)):
    # Get companies from database
    companies = get_companies_from_db(db)
    
    # Sort companies by votes (highest first)
    sorted_companies = sorted(companies, key=lambda x: x['rank'], reverse=True)
    
    return templates.TemplateResponse(
        "index.html", 
        {"request": request, "companies": sorted_companies}
    )

@app.post("/update_rank/{company_name}")
async def update_rank(
    request: Request,
    company_name: str, 
    rank: int = Form(...), 
    db: Session = Depends(get_db)
):
    """Update votes for a company"""
    # Find the company in the database
    company = get_company_by_name(db, company_name)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Update votes
    setattr(company, 'votes', rank)
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "votes": company.votes,
            "company": company_name
        })
    else:
        return RedirectResponse(url="/", status_code=303)

@app.post("/upvote/{company_name}")
async def upvote(request: Request, company_name: str, db: Session = Depends(get_db)):
    """Upvote a company"""
    # Find the company in the database
    company = get_company_by_name(db, company_name)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Increment votes
    current_votes = company.votes if company.votes is not None else 0
    setattr(company, 'votes', current_votes + 1)
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "votes": company.votes,
            "company": company_name
        })
    else:
        return RedirectResponse(url="/", status_code=303)

@app.post("/downvote/{company_name}")
async def downvote(request: Request, company_name: str, db: Session = Depends(get_db)):
    """Downvote a company"""
    # Find the company in the database
    company = get_company_by_name(db, company_name)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Decrement votes
    current_votes = company.votes if company.votes is not None else 0
    setattr(company, 'votes', current_votes - 1)
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "votes": company.votes,
            "company": company_name
        })
    else:
        return RedirectResponse(url="/", status_code=303)

# Run with: uvicorn main:app --host 0.0.0.0 --port 5000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)