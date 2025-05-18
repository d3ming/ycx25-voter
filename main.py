from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
import pandas as pd
import os
from typing import List, Dict, Any, Optional
import json
import re
import bleach
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
        # Manual fix for GroundControl company to ensure its founders are included
        if (company_name == 'GroundControl' and 
            isinstance(row['Founder Name'], str) and 
            row['Founder Name'] in ['Matthew Noseworthy', 'Mehul Shah', 'Nick Warren']):
            is_founder = True
        else:
            # Check for founder titles including more variations that appear in the data
            founder_titles = ['Founder', 'Co-Founder', 'CEO', 'Co-Founder & CEO', 'Co-Founder & CTO', 
                             'CTO & Co-Founder', 'CEO & Co-Founder', 'COO & Co-Founder', 
                             'CTO & Co-founder', 'CEO & Co-founder', 'COO & Co-founder']
            # Handle founder entries with titles containing "Founder" or "founder" anywhere in the title
            is_founder = (row['Founder Title'] in founder_titles or 
                (isinstance(row['Founder Title'], str) and 
                 ('Founder' in row['Founder Title'] or 'founder' in row['Founder Title'] or 
                  'CEO' in row['Founder Title'] or 'CTO' in row['Founder Title'] or 'COO' in row['Founder Title'])))
                  
        if is_founder:
            founder_name = row['Founder Name']
            
            # Skip company descriptions that sometimes appear in founder fields
            description_keywords = ["Open-Source", "Faster", "The Co-Pilot", "Vision-first", 
                                   "AI that", "Optimize", "for", "Co-Pilot", "founded", "inc",
                                   "Vertical AI", "Open Source"]
                                   
            # Check if this is an actual founder name and not a description
            is_description = False
            if not isinstance(founder_name, str):
                is_description = True
            elif founder_name == company_name:
                is_description = True
            # Check if the name looks like a real name (has spaces but isn't too long)
            elif isinstance(founder_name, str) and (len(founder_name) > 50 or " " not in founder_name):
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

# Get company by ID
def get_company_by_id(db: Session, company_id: int):
    """Get a company by ID"""
    return db.query(DBCompany).filter(DBCompany.id == company_id).first()

# Get company by name (keep for backward compatibility)
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
    
    # Process companies to remove unwanted fields
    for company in companies:
        # Remove founded_year and location fields
        if 'founded_year' in company:
            del company['founded_year']
        if 'location' in company:
            del company['location']
    
    # Sort companies first by tier (A,B,C,D) and then by rank (lowest first - 1 is the highest rank)
    sorted_companies = sorted(companies, key=lambda x: (
        # Tier sorting (A,B,C,D)
        'ABCD'.index(x['tier']) if x['tier'] in 'ABCD' else 3,  # Default to D (index 3) if tier not valid
        # Rank sorting (1,2,3...)
        x['rank'] if x['rank'] > 0 else float('inf')
    ))
    
    return templates.TemplateResponse(
        "index.html", 
        {"request": request, "companies": sorted_companies}
    )

@app.post("/update_rank/{company_id}")
async def update_rank(
    request: Request,
    company_id: int, 
    rank: int = Form(...), 
    db: Session = Depends(get_db)
):
    """Update votes for a company"""
    # Find the company in the database
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Update votes
    if rank < 1:
        rank = 1  # Minimum rank is 1
    
    # Using update directly on the query is more reliable with SQLAlchemy
    db.query(DBCompany).filter(DBCompany.id == company_id).update({"votes": rank})
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "rank": rank,
            "votes": rank,  # Keep for backward compatibility
            "company_id": company_id
        })
    else:
        return RedirectResponse(url="/", status_code=303)

@app.post("/upvote/{company_id}")
async def upvote(request: Request, company_id: int, db: Session = Depends(get_db)):
    """For ranking: When we upvote, we actually decrease the rank (higher number = worse rank)"""
    # Find the company in the database
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get the current rank
    current_rank = company.votes if company.votes is not None else 0
    if not isinstance(current_rank, int):
        try:
            current_rank = int(current_rank)
        except:
            current_rank = 0
    
    # Handle initial rank of 0 (unranked)
    if current_rank == 0:
        # Start at rank 2 for previously unranked companies
        # (since downranking means a higher number)
        new_rank = 2
    else:
        # Normal case: decrease rank by increasing number
        new_rank = current_rank + 1
    
    # Update the database
    db.query(DBCompany).filter(DBCompany.id == company_id).update({"votes": new_rank})
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "rank": new_rank,
            "votes": new_rank,  # Keep for backward compatibility
            "company_id": company_id
        })
    else:
        return RedirectResponse(url="/", status_code=303)

@app.post("/downvote/{company_id}")
async def downvote(request: Request, company_id: int, db: Session = Depends(get_db)):
    """Downvote a company (which improves its rank)"""
    # Find the company in the database
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # For ranking: when we downvote, we actually improve the rank (lower number)
    current_rank = company.votes if company.votes is not None else 0
    if not isinstance(current_rank, int):
        try:
            current_rank = int(current_rank)
        except:
            current_rank = 0
    
    # Handle cases where rank starts at 0 (unranked)
    if current_rank == 0:
        # Set to rank 1 (best rank) for previously unranked companies
        new_rank = 1
    elif current_rank > 1:
        # Normal case: improve rank by decreasing number
        new_rank = current_rank - 1
    else:
        # Already at rank 1, can't go higher
        new_rank = 1
    
    # Update the database with the new rank
    db.query(DBCompany).filter(DBCompany.id == company_id).update({"votes": new_rank})
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "rank": new_rank,
            "votes": new_rank,  # Keep for backward compatibility
            "company_id": company_id
        })
    else:
        return RedirectResponse(url="/", status_code=303)

# API endpoint to update a company's tier
@app.post("/update_tier/{company_id}")
async def update_tier(
    request: Request,
    company_id: int, 
    tier: str = Form(...), 
    db: Session = Depends(get_db)
):
    """Update tier for a company"""
    # Validate tier input
    if tier not in ['A', 'B', 'C', 'D']:
        raise HTTPException(status_code=422, detail="Invalid tier. Must be A, B, C, or D")
    
    # Find the company
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Update the tier directly in the database query
    db.query(DBCompany).filter(DBCompany.id == company_id).update({"tier": tier})
    db.commit()
    
    # Check if it's an AJAX request or a regular form submission
    is_ajax = request.headers.get("accept") == "application/json"
    
    if is_ajax:
        return JSONResponse({
            "success": True,
            "tier": tier,  # Return the new tier value directly
            "company_id": company_id
        })
    else:
        return RedirectResponse(url="/", status_code=303)

# API endpoint to get sorted companies
@app.get("/api/companies")
async def api_companies(request: Request, db: Session = Depends(get_db)):
    """Get sorted companies data for AJAX updates"""
    # Get companies from database
    companies = get_companies_from_db(db)
    
    # Process companies to remove unwanted fields
    for company in companies:
        # Remove founded_year and location fields
        if 'founded_year' in company:
            del company['founded_year']
        if 'location' in company:
            del company['location']
    
    # Define a helper function to determine tier order safely
    def get_tier_index(tier):
        if tier == 'A': 
            return 0
        elif tier == 'B':
            return 1
        elif tier == 'C':
            return 2
        elif tier == 'D':
            return 3
        else:
            return 3  # Default to D if tier not recognized
    
    # Make sure companies have both rank and votes fields with the same value
    for company in companies:
        # If we have votes but no rank, create rank field
        if 'votes' in company and ('rank' not in company or company['rank'] is None):
            company['rank'] = company['votes']
        # If we have rank but no votes, create votes field
        elif 'rank' in company and ('votes' not in company or company['votes'] is None):
            company['votes'] = company['rank']
        # If both are None or 0, set to a moderate value
        if ('rank' not in company or company['rank'] == 0) and ('votes' not in company or company['votes'] == 0):
            company['rank'] = company['votes'] = 9  # Default moderate rank for unranked
    
    # Sort companies first by tier (A,B,C,D) and then by rank (lowest first)
    sorted_companies = sorted(companies, key=lambda x: (
        # Tier sorting (A,B,C,D)
        get_tier_index(x.get('tier', 'C')),
        # Rank sorting (1,2,3...) - use votes for ranking
        int(x.get('votes', 9)) if x.get('votes', 0) > 0 else 9
    ))
    
    return sorted_companies

# API endpoints for managing tags
@app.post("/api/tags/{company_id}")
async def add_tag(request: Request, company_id: int, tag: str = Form(...), db: Session = Depends(get_db)):
    """Add a tag to a company"""
    # Find the company in the database
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Sanitize the tag (remove HTML and limit length)
    sanitized_tag = bleach.clean(tag, tags=[], strip=True)[:30].strip()
    
    # Don't allow empty tags
    if not sanitized_tag:
        raise HTTPException(status_code=422, detail="Tag cannot be empty")
    
    # Load existing tags or create empty list
    try:
        if company.tags:
            tags = json.loads(company.tags)
        else:
            tags = []
    except json.JSONDecodeError:
        tags = []
    
    # Check if tag already exists
    if sanitized_tag in tags:
        return JSONResponse({
            "success": True,
            "tags": tags,
            "message": "Tag already exists"
        })
    
    # Add new tag and save
    tags.append(sanitized_tag)
    setattr(company, 'tags', json.dumps(tags))
    db.commit()
    
    return JSONResponse({
        "success": True,
        "tags": tags
    })

@app.delete("/api/tags/{company_id}/{tag_index}")
async def remove_tag(request: Request, company_id: int, tag_index: int, db: Session = Depends(get_db)):
    """Remove a tag from a company by index"""
    # Find the company in the database
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Load existing tags
    try:
        if company.tags:
            tags = json.loads(company.tags)
        else:
            tags = []
    except json.JSONDecodeError:
        tags = []
    
    # Check if index is valid
    if tag_index < 0 or tag_index >= len(tags):
        raise HTTPException(status_code=422, detail="Invalid tag index")
    
    # Remove tag by index
    removed_tag = tags.pop(tag_index)
    setattr(company, 'tags', json.dumps(tags))
    db.commit()
    
    return JSONResponse({
        "success": True,
        "tags": tags,
        "removed": removed_tag
    })

# API endpoint to search/filter companies
@app.get("/api/search")
async def search_companies(
    request: Request, 
    query: str = "", 
    tags: str = "", 
    db: Session = Depends(get_db)
):
    """Search and filter companies by name, founder, or tags"""
    # Get all companies
    companies = get_companies_from_db(db)
    
    # Parse tag filter - pass a single tag as a string, not comma-separated
    tag_filter = tags.strip() if tags else ""
    
    # Filter companies
    filtered_companies = []
    for company in companies:
        # Always include company if no filters are applied
        if not query and not tag_filter:
            filtered_companies.append(company)
            continue
            
        # Check name match
        name_match = query.lower() in company['name'].lower() if query else True
        
        # Check founder match
        founder_match = False
        if query:
            for founder in company['founders']:
                if query.lower() in founder['name'].lower():
                    founder_match = True
                    break
        else:
            founder_match = True
            
        # Check tag match (company must have the selected tag)
        tag_match = True
        if tag_filter:
            company_tags = company.get('tags', [])
            # Check if the selected tag is in the company's tags
            tag_match = tag_filter in company_tags
        
        # Add company if it matches any filter
        if name_match or founder_match or tag_match:
            filtered_companies.append(company)
    
    # Sort filtered companies
    sorted_companies = sorted(filtered_companies, key=lambda x: (
        # Tier sorting (A,B,C,D)
        'ABCD'.index(x['tier']) if x['tier'] in 'ABCD' else 3,
        # Rank sorting (1,2,3...)
        x['rank'] if x['rank'] > 0 else float('inf')
    ))
    
    return sorted_companies

# Run with: uvicorn main:app --host 0.0.0.0 --port 5000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)