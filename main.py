from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import pandas as pd
import os
from typing import List, Dict, Any, Optional
import json
from pydantic import BaseModel

app = FastAPI(title="YC X25 Batch Explorer")

# Mount static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="templates")

# Model for company data
class Company(BaseModel):
    name: str
    description: str
    website: str
    rank: int = 0
    url: str
    founders: List[Dict[str, str]]
    founded_year: str
    location: str
    company_linkedin: Optional[str] = None

# Global data store
DATA_FILE = "data/companies.json"
ORIGINAL_CSV = "attached_assets/yc_companies_S25.csv"

# Function to load and process data
def load_and_process_data():
    """Process YC companies data from CSV and return as list of Company objects"""
    os.makedirs("data", exist_ok=True)
    
    # Check if processed data already exists
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            companies_data = json.load(f)
            return companies_data
    
    # Otherwise process from CSV
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
    
    import re
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
    companies_list = list(companies.values())
    
    # Save processed data
    with open(DATA_FILE, "w") as f:
        json.dump(companies_list, f)
    
    return companies_list

# Data dependency
def get_companies():
    """Dependency to get company data"""
    return load_and_process_data()

@app.get("/")
async def home(request: Request, companies: List[Dict] = Depends(get_companies)):
    # Sort companies by rank (highest first)
    sorted_companies = sorted(companies, key=lambda x: x['rank'], reverse=True)
    return templates.TemplateResponse(
        "index.html", 
        {"request": request, "companies": sorted_companies}
    )

@app.post("/update_rank/{company_name}")
async def update_rank(company_name: str, rank: int = Form(...), companies: List[Dict] = Depends(get_companies)):
    """Update votes for a company"""
    # Find the company and update its rank
    for company in companies:
        if company['name'] == company_name:
            company['rank'] = rank
            break
    
    # Save updates
    with open(DATA_FILE, "w") as f:
        json.dump(companies, f)
    
    return RedirectResponse(url="/", status_code=303)

@app.post("/upvote/{company_name}")
async def upvote(company_name: str, companies: List[Dict] = Depends(get_companies)):
    # Find the company and increment its rank
    for company in companies:
        if company['name'] == company_name:
            company['rank'] += 1
            break
    
    # Save updates
    with open(DATA_FILE, "w") as f:
        json.dump(companies, f)
    
    return RedirectResponse(url="/", status_code=303)

@app.post("/downvote/{company_name}")
async def downvote(company_name: str, companies: List[Dict] = Depends(get_companies)):
    # Find the company and decrement its rank
    for company in companies:
        if company['name'] == company_name:
            company['rank'] -= 1
            break
    
    # Save updates
    with open(DATA_FILE, "w") as f:
        json.dump(companies, f)
    
    return RedirectResponse(url="/", status_code=303)

# Run with: uvicorn main:app --host 0.0.0.0 --port 5000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)