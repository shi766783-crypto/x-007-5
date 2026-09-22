<script setup>
import { reactive, ref, computed } from 'vue'
import { DISH_CATEGORIES, DIFFICULTIES, UNITS, DISH_TAG_PRESETS } from '@/constants'
import { useInventoryStore } from '@/stores/inventory'
import { useMealPlanStore } from '@/stores/mealPlan'

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
  tags: [...(props.initial?.tags || [])],
  ingredients: props.initial?.ingredients?.length
    ? props.initial.ingredients.map((i) => ({ ...i }))
    : [{ ingredientId: null, name: '', quantity: 1, unit: '克' }],
})

const pickValue = ref('')
const tagInput = ref('')

// 标签快捷建议：已用过的标签优先，加上预设，排除已选
const tagSuggestions = computed(() => {
  const pool = [...mealPlan.allTags, ...DISH_TAG_PRESETS]
  return [...new Set(pool)].filter((t) => !form.tags.includes(t)).slice(0, 8)
})

function addTag(tag) {
  const v = (tag ?? tagInput.value).trim()
  if (v && !form.tags.includes(v)) form.tags.push(v)
  tagInput.value = ''
}

function removeTag(tag) {
  form.tags = form.tags.filter((t) => t !== tag)
}

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

function submit() {
  if (!form.name.trim()) return
  const ingredients = form.ingredients
    .filter((i) => i.name.trim())
    .map((i) => ({ ...i, name: i.name.trim(), quantity: Number(i.quantity) }))
  const tags = [...new Set(form.tags.map((t) => t.trim()).filter(Boolean))]
  emit('submit', {
    ...form,
    name: form.name.trim(),
    cookTime: Number(form.cookTime),
    tags,
    ingredients,
  })
}
</script>

<template>
  <form class="dish-form" @submit.prevent="submit">
    <div class="field">
      <label>菜名 *</label>
      <input v-model="form.name" type="text" placeholder="如：番茄炒蛋" required />
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
      <label>标签（可多个，方便筛选）</label>
      <div v-if="form.tags.length" class="tag-list">
        <span v-for="t in form.tags" :key="t" class="tag-item">
          {{ t }}
          <button type="button" class="tag-rm" @click="removeTag(t)">✕</button>
        </span>
      </div>
      <div class="tag-input-row">
        <input
          v-model="tagInput"
          type="text"
          placeholder="自定义标签，如：快手、低卡、孩子爱吃"
          @keydown.enter.prevent="addTag()"
        />
        <button type="button" class="add-btn" @click="addTag()">+ 添加</button>
      </div>
      <div v-if="tagSuggestions.length" class="tag-suggest">
        <button v-for="t in tagSuggestions" :key="t" type="button" class="suggest-chip" @click="addTag(t)">
          {{ t }}
        </button>
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
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: #7e57c222;
  color: #7e57c2;
  font-weight: 500;
}
.tag-rm {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  padding: 0;
}
.tag-input-row {
  display: flex;
  gap: 8px;
}
.tag-input-row input {
  flex: 1;
}
.tag-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.suggest-chip {
  border: 1px dashed var(--border);
  background: #fff;
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
}
.suggest-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
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
