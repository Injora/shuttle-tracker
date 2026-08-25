-- Increase the college geofence so pickup detection covers the wider
-- campus footprint (including upper floors and normal GPS drift).
update public.stops
set geofence_radius_m = 300
where id = 'college';
