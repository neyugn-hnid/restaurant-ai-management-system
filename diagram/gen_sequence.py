#!/usr/bin/env python3
# Gen sequence diagram from usecase-spec.txt
import os, re

DIAGRAM_DIR = os.path.dirname(os.path.abspath(__file__))
SPEC_FILE = os.path.join(DIAGRAM_DIR, 'usecase-spec.txt')

def parse_uc(filepath):
    entries = []
    with open(filepath) as f:
        content = f.read().strip()
    blocks = content.split('\n\n')
    for block in blocks:
        uc = {}
        for line in block.strip().split('\n'):
            if ':#' in line:
                key, val = line.split(':#', 1)
                key = key.strip()
                val = val.strip()
                uc[key] = val
        if uc:
            entries.append(uc)
    return entries

def gen_actor(uc):
    """Xác định actor chính từ tác nhân"""
    actor = uc.get('Tác nhân chính', 'Nguoi dung')
    if 'Admin' in actor and 'Nhân viên' in actor:
        return 'Admin'
    return actor.split(',')[0].strip()

def gen_participants(uc):
    """Xác định participants dựa trên tên use case"""
    name = uc.get('Tên use case', '')
    if 'tài khoản' in name.lower() or 'dang ky' in name.lower() or 'dang nhap' in name.lower():
        return ['AuthController', 'EmailService', 'DB Accounts']
    if 'món' in name.lower() or 'thuc don' in name.lower():
        return ['ProductsController', 'DB Categories', 'DB Products']
    if 'don hang' in name.lower():
        return ['OrdersController', 'OrderItemsController', 'DB Orders', 'DB Products']
    if 'ban an' in name.lower() or 'ban' in name.lower():
        return ['TablesController', 'DB RestaurantTables']
    if 'khach hang' in name.lower():
        return ['CustomersController', 'DB Customers']
    if 'thong ke' in name.lower():
        return ['AnalyticsController', 'DB (aggregate)']
    if 'dat ban' in name.lower() or 'reservation' in name.lower():
        return ['ReservationsController', 'DB RestaurantTables', 'DB Reservations']
    if 'AI' in name or 'DeepSeek' in name:
        return ['DeepSeekChatClient', 'DeepSeek API (external)']
    return ['Controller', 'Database']

def gen_flow_steps(flow_text):
    """Parse flow text thành steps"""
    if not flow_text:
        return []
    steps = re.split(r'\d+\.', flow_text)
    steps = [s.strip() for s in steps if s.strip()]
    return steps

def gen_exception_steps(flow_text):
    """Parse exception flow"""
    if not flow_text:
        return []
    # Pattern: 5a. ... 6a. ...
    steps = re.split(r'\d+a\.', flow_text)
    steps = [s.strip() for s in steps if s.strip()]
    return steps

def generate_puml(uc):
    name = uc.get('Tên use case', 'Unknown')
    actor = gen_actor(uc)
    participants = gen_participants(uc)
    main_steps = gen_flow_steps(uc.get('Luồng sự kiện chính', ''))
    except_steps = gen_exception_steps(uc.get('Luồng ngoại lệ', ''))
    
    lines = ['@startuml']
    lines.append('skinparam defaultTextAlignment center')
    lines.append('skinparam backgroundColor #FEFEFE')
    lines.append('')
    lines.append(f'title {name}')
    lines.append('')
    lines.append(f'actor "{actor}" as user')
    
    for i, p in enumerate(participants):
        if 'DB' in p or 'Database' in p:
            lines.append(f'database "{p}" as db{i}')
        elif 'external' in p.lower() or 'API' in p:
            lines.append(f'participant "{p}" as sv{i} <<external>>')
        else:
            lines.append(f'participant "{p}" as sv{i}')
    
    lines.append('')
    lines.append('== Luong chinh ==')
    
    last_target = None
    for i, step in enumerate(main_steps):
        step = step.strip()
        # Determine source and target based on step keywords
        step_lower = step.lower()
        
        if i == 0:
            src, tgt = 'user', 'sv0'
        elif i == len(main_steps) - 1:
            src, tgt = 'sv0', 'user'
        else:
            src, tgt = 'sv0', f'db{i % len([d for d in participants if "DB" in d])}' if any('DB' in p for p in participants) else 'sv0'
        
        # Simplify - first interaction from user, last to user, rest between system
        if i == 0:
            lines.append(f'user -> sv0 : {step}')
        elif i == len(main_steps) - 1:
            lines.append(f'sv0 --> user : {step}')
        else:
            # Alternate between sv and db
            target = f'db{(i-1) % max(1, len([d for d in participants if "DB" in d or "db" in d.lower()]))}' if any('DB' in p for p in participants) else 'sv0'
            lines.append(f'sv0 -> {target} : {step}')
            if (i) % 2 == 0:
                lines.append(f'{target} --> sv0 : OK')
    
    if except_steps:
        lines.append('')
        lines.append('== Luong ngoai le ==')
        for step in except_steps:
            lines.append(f'sv0 --> user : {step}')
    
    lines.append('')
    lines.append('@enduml')
    
    return '\n'.join(lines)

# Main
print(f"Reading: {SPEC_FILE}")
uc_list = parse_uc(SPEC_FILE)
print(f"Found: {len(uc_list)} use cases\n")

for i, uc in enumerate(uc_list):
    name = uc.get('Tên use case', f'UC{i+1}')
    safe_name = re.sub(r'[\\/*?:"<>|]', '', name).strip()
    safe_name = re.sub(r'\s+', '-', safe_name.lower())
    
    puml = generate_puml(uc)
    outfile = os.path.join(DIAGRAM_DIR, f'seq_{safe_name}.puml')
    
    with open(outfile, 'w') as f:
        f.write(puml)
    print(f"  [{i+1:>2}] {name} -> seq_{safe_name}.puml")

print(f"\n✅ Generated {len(uc_list)} sequence diagrams")
print("Run: bash render.sh to render all")
