-- Untrains the given tokens and user agent from the given category.
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
    if currentCategory ~= category then
        -- Nothing to do. We were asked to untrain a category value that doesn't
        -- match the currently trained value.
        return redis.error_reply("Category to untrain doesn't match existing category: " .. currentCategory)
    end
else
    -- Nothing to do. We were asked to untrain a category value that isn't set.
    return redis.status_reply('Nothing to untrain.')
end

-- Remove the attribute from the user agent.
attrData[attrId] = nil
attrJson         = cjson.encode(attrData)

if attrJson == '{}' then
    -- No more attrs. Delete the UA.
    redis.call('HDEL', keyUserAgents, ua)
else
    redis.call('HSET', keyUserAgents, ua, attrJson)
end

-- Decrement the number of user agents trained in this category.
if redis.call('HINCRBY', keyCategories, category, -1) < 1 then
    -- Remove the category when it hits 0.
    redis.call('HDEL', keyCategories, category)
end

-- Decrement the number of times each token has been seen in a user agent in
-- this category.
for i, token in pairs(ARGV) do
    if i > 3 then
        if redis.call('HINCRBY', keyCategory, token, -1) < 1 then
            -- Remove the token when it hits 0.
            redis.call('HDEL', keyCategory, token)
        end
    end
end
