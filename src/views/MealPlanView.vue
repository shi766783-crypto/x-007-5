<script setup>
import { ref, computed } from 'vue'
import { useMealPlanStore } from '@/stores/mealPlan'
import { WEEK_DAYS, MEALS, MEAL_ICONS, DIFFICULTY_COLORS } from '@/constants'
import { currentWeekKey, toWeekKey, parseDateKey, weekStartFromKey } from '@/utils/date'
import { tagColor } from '@/utils/tagColor'
import DishForm from '@/components/mealplan/DishForm.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const mealPlan = useMealPlanStore()

const weekKey = ref(currentWeekKey())
const showSlotPicker = ref(false)
const showDishForm = ref(false)
const showLibrary = ref(false)
const editingDish = ref(null)
const slotTarget = ref({ day: 'monday', meal: '早餐' })
const search = ref('') // 选菜弹窗搜索
const libSearch = ref('') // 菜谱库搜索
const activeTags = ref([]) // 选菜弹窗选中的标签
const libActiveTags = ref([]) // 菜谱库选中的标签

const weekDays = computed(() => mealPlan.plan[weekKey.value] || {})
const weekLabel = computed(() => {
  const start = weekStartFromKey(weekKey.value)
  const d = parseDateKey(start)
  return `${d.getMonth() + 1}月${d.getDate()}日 起`
})

// 关键词匹配菜名或标签
function matchKeyword(dish, q) {
  return dish.name.includes(q) || dish.tags.some((t) => t.includes(q))
}

// 选菜列表：搜索 + 标签筛选，收藏菜品排在前面
const filteredDishes = computed(() => {
  const q = search.value.trim()
  const tags = activeTags.value
  return mealPlan.dishes
    .filter(
      (d) =>
        (!q || matchKeyword(d, q)) &&
        tags.every((t) => d.tags.includes(t))
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
})

// 菜谱库列表：搜索 + 标签筛选，收藏置顶
const filteredLibrary = computed(() => {
  const q = libSearch.value.trim()
  const tags = libActiveTags.value
  return mealPlan.dishes
    .filter(
      (d) =>
        (!q || matchKeyword(d, q)) &&
        tags.every((t) => d.tags.includes(t))
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
})

function toggleTag(list, tag) {
  const idx = list.value.indexOf(tag)
  if (idx === -1) list.value.push(tag)
  else list.value.splice(idx, 1)
}

function shiftWeek(delta) {
  const start = parseDateKey(weekStartFromKey(weekKey.value))
  start.setDate(start.getDate() + delta * 7)
  weekKey.value = toWeekKey(start)
}

function openPicker(day, meal) {
  slotTarget.value = { day, meal }
  showSlotPicker.value = true
}

function pickDish(dishId) {
  mealPlan.toggleDish(weekKey.value, slotTarget.value.day, slotTarget.value.meal, dishId)
}

function removeDish(day, meal, dishId) {
  mealPlan.toggleDish(weekKey.value, day, meal, dishId)
}

function openNewDish() {
  editingDish.value = null
  showDishForm.value = true
}

function openEditDish(dish) {
  editingDish.value = dish
  showDishForm.value = true
}

function onDishSave(data) {
  if (editingDish.value) mealPlan.updateDish(editingDish.value.id, data)
  else mealPlan.addDish(data)
  showDishForm.value = false
}

function mealSlot(day, meal) {
  const m = { 早餐: 'breakfast', 午餐: 'lunch', 晚餐: 'dinner' }[meal]
  return (weekDays.value[day] && weekDays.value[day][m]) || []
}
</script>

<template>
  <div>
    <div class="page-head">
      <h2>📅 每周食谱计划</h2>
      <div class="head-actions">
        <BaseButton variant="ghost" size="sm" @click="showLibrary = true">我的菜谱（{{ mealPlan.dishes.length }}）</BaseButton>
        <BaseButton size="sm" @click="openNewDish">+ 新建菜品</BaseButton>
      </div>
    </div>

    <div class="week-nav card">
      <BaseButton variant="ghost" size="sm" @click="shiftWeek(-1)">‹ 上周</BaseButton>
      <div class="week-label">
        <span class="week-title">{{ weekKey }}</span>
        <span class="muted small">{{ weekLabel }}</span>
      </div>
      <BaseButton variant="ghost" size="sm" @click="shiftWeek(1)">下周 ›</BaseButton>
      <BaseButton variant="text" size="sm" @click="weekKey = currentWeekKey()">回到本周</BaseButton>
    </div>

    <div class="plan-board">
      <div class="plan-header">
        <div class="corner"></div>
        <div v-for="d in WEEK_DAYS" :key="d.key" class="day-head">{{ d.label }}</div>
      </div>
      <div v-for="meal in MEALS" :key="meal" class="plan-row">
        <div class="meal-label">
          {{ MEAL_ICONS[meal] }} {{ meal }}
        </div>
        <div v-for="d in WEEK_DAYS" :key="d.key" class="slot">
          <div v-for="dishId in mealSlot(d.key, meal)" :key="dishId" class="dish-chip">
            <BaseTag :text="mealPlan.dishMap[dishId]?.name || '未知'" :color="DIFFICULTY_COLORS[mealPlan.dishMap[dishId]?.difficulty] || '#90a4ae'" />
            <button class="rm" @click="removeDish(d.key, meal, dishId)">✕</button>
          </div>
          <button class="add-slot" @click="openPicker(d.key, meal)">+</button>
        </div>
      </div>
    </div>

    <!-- 菜品选择 -->
    <BaseModal :show="showSlotPicker" :title="`为 ${slotTarget.meal} 选择菜品`" width="560px" @close="showSlotPicker = false">
      <div class="picker-search">
        <input v-model="search" type="text" placeholder="搜索菜名或标签…" />
        <BaseButton size="sm" variant="ghost" @click="openNewDish">+ 新建</BaseButton>
      </div>
      <div v-if="mealPlan.allTags.length" class="tag-filter">
        <button
          v-for="t in mealPlan.allTags"
          :key="t.name"
          type="button"
          class="tag-filter-item"
          :class="{ active: activeTags.includes(t.name) }"
          :style="activeTags.includes(t.name)
            ? { background: tagColor(t.name), borderColor: tagColor(t.name), color: '#fff' }
            : { color: tagColor(t.name) }"
          @click="toggleTag(activeTags, t.name)"
        >
          {{ t.name }} <span class="tag-count">{{ t.count }}</span>
        </button>
        <button v-if="activeTags.length" type="button" class="tag-clear" @click="activeTags = []">
          清除筛选
        </button>
      </div>
      <BaseEmpty v-if="!filteredDishes.length" emoji="🍲" text="没有符合条件的菜品，换个关键词或标签试试" />
      <div v-else class="dish-list">
        <div v-for="dish in filteredDishes" :key="dish.id" class="dish-row">
          <button
            type="button"
            class="star"
            :class="{ on: dish.favorite }"
            :title="dish.favorite ? '取消收藏' : '收藏'"
            @click="mealPlan.toggleFavorite(dish.id)"
          >
            {{ dish.favorite ? '★' : '☆' }}
          </button>
          <div class="dish-info">
            <span class="dish-name">
              {{ dish.name }}
            </span>
            <span class="muted small">{{ dish.ingredients.length }} 种食材 · {{ dish.cookTime }}分钟</span>
            <span v-if="dish.tags.length" class="dish-tags">
              <span
                v-for="t in dish.tags"
                :key="t"
                class="mini-tag"
                :style="{ background: tagColor(t) + '22', color: tagColor(t) }"
              >{{ t }}</span>
            </span>
          </div>
          <BaseButton size="sm" @click="pickDish(dish.id)">加入</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 菜谱库 -->
    <BaseModal :show="showLibrary" title="我的菜谱库" width="640px" @close="showLibrary = false">
      <div class="lib-toolbar">
        <input v-model="libSearch" type="text" placeholder="搜索菜名或标签…" />
      </div>
      <div v-if="mealPlan.allTags.length" class="tag-filter">
        <button
          v-for="t in mealPlan.allTags"
          :key="t.name"
          type="button"
          class="tag-filter-item"
          :class="{ active: libActiveTags.includes(t.name) }"
          :style="libActiveTags.includes(t.name)
            ? { background: tagColor(t.name), borderColor: tagColor(t.name), color: '#fff' }
            : { color: tagColor(t.name) }"
          @click="toggleTag(libActiveTags, t.name)"
        >
          {{ t.name }} <span class="tag-count">{{ t.count }}</span>
        </button>
        <button v-if="libActiveTags.length" type="button" class="tag-clear" @click="libActiveTags = []">
          清除筛选
        </button>
      </div>
      <BaseEmpty v-if="!mealPlan.dishes.length" emoji="📖" text="暂无菜谱" />
      <BaseEmpty v-else-if="!filteredLibrary.length" emoji="🔍" text="没有符合条件的菜品" />
      <div v-else class="library">
        <div v-for="dish in filteredLibrary" :key="dish.id" class="lib-item">
          <div class="lib-head">
            <span class="dish-name">
              <button
                type="button"
                class="star"
                :class="{ on: dish.favorite }"
                :title="dish.favorite ? '取消收藏' : '收藏'"
                @click="mealPlan.toggleFavorite(dish.id)"
              >
                {{ dish.favorite ? '★' : '☆' }}
              </button>
              {{ dish.name }}
            </span>
            <BaseTag :category="dish.category" :text="dish.category" />
          </div>
          <div v-if="dish.tags.length" class="dish-tags">
            <span
              v-for="t in dish.tags"
              :key="t"
              class="mini-tag"
              :style="{ background: tagColor(t) + '22', color: tagColor(t) }"
            >{{ t }}</span>
          </div>
          <div class="muted small">
            {{ dish.ingredients.map((i) => i.name).join('、') || '无食材' }} · {{ dish.cookTime }}分钟 · {{ dish.difficulty }}
          </div>
          <div v-if="dish.instructions" class="muted small instr">{{ dish.instructions }}</div>
          <div class="lib-actions">
            <BaseButton size="sm" variant="ghost" @click="openEditDish(dish)">编辑</BaseButton>
            <BaseButton size="sm" variant="text" @click="mealPlan.removeDish(dish.id)">删除</BaseButton>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- 菜品表单 -->
    <BaseModal :show="showDishForm" :title="editingDish ? '编辑菜品' : '新建菜品'" width="640px" @close="showDishForm = false">
      <DishForm :initial="editingDish" @submit="onDishSave" @cancel="showDishForm = false" />
    </BaseModal>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-head h2 {
  margin: 0;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.week-label {
  flex: 1;
  text-align: center;
}
.week-title {
  font-weight: 700;
  font-size: 16px;
}
.small {
  font-size: 12px;
}
.plan-board {
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
}
.plan-header,
.plan-row {
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(120px, 1fr));
  gap: 6px;
  align-items: stretch;
}
.plan-header {
  margin-bottom: 6px;
}
.day-head {
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-2);
  padding: 6px 0;
}
.plan-row {
  margin-bottom: 6px;
}
.meal-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-2);
  font-weight: 600;
  border-right: 1px solid var(--border);
}
.slot {
  min-height: 56px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-2);
}
.dish-chip {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dish-chip :deep(.tag) {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rm {
  border: none;
  background: none;
  color: var(--text-2);
  cursor: pointer;
  font-size: 12px;
}
.add-slot {
  border: none;
  background: none;
  color: var(--text-2);
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
}
.add-slot:hover {
  color: var(--primary);
}
.picker-search {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.picker-search input,
.lib-toolbar input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
}
.lib-toolbar {
  margin-bottom: 10px;
}
.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.tag-filter-item {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  line-height: 1.6;
}
.tag-filter-item:hover {
  border-color: currentColor;
}
.tag-count {
  opacity: 0.55;
  font-size: 11px;
}
.tag-clear {
  border: none;
  background: none;
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
}
.star {
  border: none;
  background: none;
  font-size: 17px;
  color: #ccc;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
}
.star:hover {
  color: #ffa000;
}
.star.on {
  color: #ffa000;
}
.dish-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.mini-tag {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
}
.dish-list,
.library {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 50vh;
  overflow-y: auto;
}
.dish-row,
.lib-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.dish-row {
  align-items: flex-start;
}
.dish-row .star {
  margin-top: 2px;
}
.dish-row :deep(button) {
  flex-shrink: 0;
}
.lib-item {
  flex-direction: column;
  align-items: stretch;
}
.lib-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lib-head .dish-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dish-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dish-name {
  font-weight: 600;
}
.instr {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lib-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
