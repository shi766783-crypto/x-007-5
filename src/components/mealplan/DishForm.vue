<script setup>
import { computed, reactive, ref } from 'vue'
import { DISH_CATEGORIES, DIFFICULTIES, UNITS } from '@/constants'
import { useInventoryStore } from '@/stores/inventory'
import { useMealPlanStore } from '@/stores/mealPlan'
import { tagColor } from '@/utils/tagColor'

const props = defineProps({
  initial: { type: Object, default: null },
})
const emit = defineEmits(['submit', 'cancel'])

const inventory = useInventoryStore()
const mealPlan = useMealPlanStore()

const form = reactive({
  name: props.initial?.name || '',
  category: props.initial?.category || '蔬菜',
  difficulty: props.initial?.difficulty || '简单',
  cookTime: props.initial?.cookTime ?? 15,
  instructions: props.initial?.instructions || '',
  favorite: !!props.initial?.favorite,
  tags: props.initial?.tags ? [...props.initial.tags] : [],
  ingredients: props.initial?.ingredients?.length
    ? props.initial.ingredients.map((i) => ({ ...i }))
    : [{ ingredientId: null, name: '', quantity: 1, unit: '克' }],
})

const pickValue = ref('')
const tagInput = ref('')

// 已使用过、当前菜品还没挂上的标签，供快速点选
const tagSuggestions = computed(() =>
  mealPlan.allTags
    .map((t) => t.name)
    .filter((t) => !form.tags.includes(t))
)

function addIngredient() {
  form.ingredients.push({ ingredientId: null, name: '', quantity: 1, unit: '克' })
}

function removeIngredient(index) {
  if (form.ingredients.length === 1) {
    form.ingredients[0] = { ingredientId: null, name: '', quantity: 1, unit: '克' }
  } else {
    form.ingredients.splice(index, 1)
  }
}

function applyPick() {
  if (!pickValue.value) return
  const item = inventory.items.find((i) => i.id === pickValue.value)
  if (!item) return
  form.ingredients.push({
    ingredientId: item.id,
    name: item.name,
    quantity: 1,
    unit: item.unit,
  })
  pickValue.value = ''
}

function addTag(raw) {
  const name = (raw ?? tagInput.value).trim()
  tagInput.value = ''
  if (!name || form.tags.includes(name)) return
  form.tags.push(name)
}

function removeTag(name) {
  form.tags = form.tags.filter((t) => t !== name)
}

function submit() {
  if (!form.name.trim()) return
  const ingredients = form.ingredients
    .filter((i) => i.name.trim())
    .map((i) => ({ ...i, name: i.name.trim(), quantity: Number(i.quantity) }))
  emit('submit', {
    ...form,
    name: form.name.trim(),
    cookTime: Number(form.cookTime),
    tags: [...new Set(form.tags.map((t) => t.trim()).filter(Boolean))],
    ingredients,
  })
}
</script>

<template>
  <form class="dish-form" @submit.prevent="submit">
    <div class="field">
      <label>菜名 *</label>
      <div class="name-row">
        <input v-model="form.name" type="text" placeholder="如：番茄炒蛋" required />
        <button
          type="button"
          class="fav-btn"
          :class="{ active: form.favorite }"
          :title="form.favorite ? '取消收藏' : '收藏这道菜'"
          @click="form.favorite = !form.favorite"
        >
          {{ form.favorite ? '★' : '☆' }}
        </button>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label>菜品类别</label>
        <select v-model="form.category">
          <option v-for="c in DISH_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="field">
        <label>难度</label>
        <select v-model="form.difficulty">
          <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="field">
        <label>烹饪时长（分钟）</label>
        <input v-model.number="form.cookTime" type="number" min="1" />
      </div>
    </div>

    <div class="field">
      <label>自定义标签</label>
      <div class="tags-selected">
        <span v-for="t in form.tags" :key="t" class="tag-chip" :style="{ background: tagColor(t) + '22', color: tagColor(t) }">
          {{ t }}
          <button type="button" class="tag-x" :style="{ color: tagColor(t) }" @click="removeTag(t)">✕</button>
        </span>
        <input
          v-model="tagInput"
          type="text"
          class="tag-input"
          :placeholder="form.tags.length ? '添加标签' : '如：快手、低卡、孩子爱吃，回车添加'"
          @keydown.enter.prevent="addTag()"
          @keydown.delete="tagInput || form.tags.pop()"
        />
      </div>
      <div v-if="tagSuggestions.length" class="tag-suggest">
        <span class="muted small">常用：</span>
        <button
          v-for="t in tagSuggestions"
          :key="t"
          type="button"
          class="tag-suggest-item"
          @click="addTag(t)"
        >
          + {{ t }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>所需食材清单</label>
      <div class="pick-row">
        <select v-model="pickValue" @change="applyPick">
          <option value="">+ 从库存选择食材…</option>
          <option v-for="i in inventory.items" :key="i.id" :value="i.id">
            {{ i.name }}（{{ i.unit }}）
          </option>
        </select>
        <button type="button" class="add-btn" @click="addIngredient">+ 手动添加</button>
      </div>

      <div v-for="(ing, idx) in form.ingredients" :key="idx" class="ing-row">
        <input v-model="ing.name" type="text" placeholder="食材名" class="grow" />
        <input v-model.number="ing.quantity" type="number" min="0" step="0.01" class="qty" />
        <select v-model="ing.unit">
          <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
        </select>
        <button type="button" class="del-btn" @click="removeIngredient(idx)">✕</button>
      </div>
    </div>

    <div class="field">
      <label>做法简介</label>
      <textarea v-model="form.instructions" rows="3" placeholder="简单描述做法…"></textarea>
    </div>

    <div class="actions">
      <button type="button" class="btn-cancel" @click="emit('cancel')">取消</button>
      <button type="submit" class="btn-submit">保存</button>
    </div>
  </form>
</template>

<style scoped>
.dish-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12px;
  color: var(--text-2);
  font-weight: 500;
}
.name-row {
  display: flex;
  gap: 8px;
}
.name-row input {
  flex: 1;
}
.fav-btn {
  width: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  font-size: 18px;
  color: #bbb;
  cursor: pointer;
}
.fav-btn.active {
  background: #fff8e1;
  border-color: #ffb300;
  color: #ffa000;
}
.tags-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}
.tags-selected:focus-within {
  border-color: var(--primary);
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.tag-x {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  opacity: 0.7;
}
.tag-x:hover {
  opacity: 1;
}
.tag-input {
  flex: 1;
  min-width: 140px;
  border: none !important;
  padding: 2px 0 !important;
}
.tag-input:focus {
  outline: none;
}
.tag-suggest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.tag-suggest-item {
  border: 1px dashed var(--border);
  background: #fff;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
}
.tag-suggest-item:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.small {
  font-size: 12px;
}
input,
select,
textarea {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
}
.pick-row {
  display: flex;
  gap: 8px;
}
.pick-row select {
  flex: 1;
}
.add-btn {
  background: var(--primary-light);
  border: 1px solid var(--primary);
  color: var(--primary-dark);
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
  white-space: nowrap;
}
.ing-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.ing-row .grow {
  flex: 1;
}
.ing-row .qty {
  width: 70px;
}
.ing-row select {
  width: 70px;
}
.del-btn {
  border: none;
  background: var(--danger-light);
  color: var(--danger);
  width: 30px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}
.btn-cancel,
.btn-submit {
  padding: 9px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.btn-cancel {
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-submit {
  background: var(--primary);
  border: none;
  color: #fff;
  font-weight: 600;
}
@media (max-width: 560px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
