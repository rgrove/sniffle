-- Trains the given tokens and user agent into the given category.
--
-- Keys:
--
--   - `sniffle:user-agents`
--   - `sniffle:<attrId>:categories`
--   - `sniffle:<attrId>:category:<category>`
--
-- Args:
--
--   - User agent
--   - Attribute id
--   - Category name
--   - ...one or more tokens as args
local keyUserAgents = KEYS[1]
local keyCategories = KEYS[2]
local keyCategory   = KEYS[3]

local ua       = ARGV[1]
local attrId   = ARGV[2]
local category = ARGV[3]

-- Decode the stored attribute data for this user agent, if any.
local attrData
local attrJson = redis.call('HGET', keyUserAgents, ua)
local currentCategory

if attrJson then
    attrData        = cjson.decode(attrJson)
    currentCategory = attrData[attrId]
else
    attrData = {}
end

if currentCategory then
    if currentCategory == category then
        -- Nothing to do. We've already been trained.
        return redis.status_reply('Already trained.')
    else
        -- Error: This category has already been trained and must be untrained
        -- first or we'll ruin the data.
        return redis.error_reply('Must untrain existing category first: ' .. currentCategory)
    end
end

-- Store the new attribute value in the UA hash.
attrData[attrId] = category
redis.call('HSET', keyUserAgents, ua, cjson.encode(attrData))

-- Increment the number of user agents trained in this category.
redis.call('HINCRBY', keyCategories, category, 1)

-- Increment the number of times each token has been seen in a user agent in
-- this category.
for i, token in pairs(ARGV) do
    if i > 3 then
        redis.call('HINCRBY', keyCategory, token, 1)
    end
end
