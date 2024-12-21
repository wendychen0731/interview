<template>
  <q-page class="row q-pt-xl">
    <div class="full-width q-px-xl">
      <!-- 新增/更新資料區塊 -->
      <h6 class="mode-title" v-if="!isEditing">新增資料</h6>
      <h6 class="mode-title" v-else>編輯資料</h6>
      <div class="q-mb-xl">
        <div :class="{ 'edit-mode': isEditing }" style="padding: 20px;">
          <q-input 
            v-model="tempData.name" 
            label="姓名" 
            required
            :rules="[
              val => (val && val.trim().length > 0) || '姓名不得空白'
            ]"
            clearable
          />
          <q-input 
            v-model="tempData.age" 
            label="年齡"
            type="number" 
            required 
            :rules="[
              val => (val && /^[1-9][0-9]*$/.test(String(val))) || '年齡不得空白且需為正整數'
            ]"
            clearable
          />
        </div>

        <q-btn
          :color="isEditing ? 'secondary' : 'primary'"
          class="q-mt-md"
          @click="isEditing ? handleUpdate() : handleAdd()"
        >
          {{ isEditing ? '更新' : '新增' }}
        </q-btn>
        <q-btn
          v-if="isEditing"
          flat
          label="取消"
          class="q-ml-sm q-mt-md"
          @click="cancelEdit"
        />
      </div>

      <!-- 資料表格 -->
      <q-table
        flat
        bordered
        ref="tableRef"
        :rows="blockData"
        :columns="tableConfig"
        row-key="id" 
        hide-pagination 
        separator="cell"
        :rows-per-page-options="[0]" 
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.label }}
            </q-th>
            <q-th></q-th>
          </q-tr>
        </template>

        <!-- 表格主體 -->
        <template v-slot:body="props">
          <q-tr :props="props">
            <q-td
              v-for="col in props.cols"
              :key="col.name"
              :props="props"
              style="min-width: 120px"
            >
              <div>{{ props.row[col.field] }}</div>
            </q-td>
            <q-td class="text-right" auto-width v-if="tableButtons.length > 0">
              <q-btn
                v-for="(btn, index) in tableButtons"
                :key="index"
                size="sm"
                color="grey-6"
                round
                dense
                :icon="btn.icon"
                class="q-ml-md"
                padding="5px 5px"
                @click="handleClickOption(btn, props.row)"
                >
                <!-- 按鈕的提示工具 -->
                <q-tooltip
                  transition-show="scale"
                  transition-hide="scale"
                  anchor="top middle"
                  self="bottom middle"
                  :offset="[10, 10]"
                >
                  {{ btn.label }}
                </q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>
        </template>

        <template v-slot:no-data="{ icon }">
          <div
            class="full-width row flex-center items-center text-primary q-gutter-sm"
            style="font-size: 18px"
          >
            <q-icon size="2em" :name="icon" />
            <span> 無相關資料 </span>
          </div>
        </template>
      </q-table>

      <!-- 刪除確認彈窗 -->
      <q-dialog v-model="deleteDialog">
        <q-card class="delete-dialog">
          <q-card-section class="q-pt-none">
            <div class="text-h4">提示</div>
          </q-card-section>

          <q-card-section>
            <div>是否確定要刪除該筆資料? <strong>{{ itemToDelete?.name }}</strong></div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="取消" @click="cancelDelete" />
            <q-btn label="確定" @click="confirmDelete" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import axios from 'axios';
import { QTableProps } from 'quasar';
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// 定義按鈕類型
interface BtnType {
  label: string;
  icon: string;
  status: 'edit' | 'delete';
}

// 定義按鈕操作的類型
type ButtonAction = BtnType | { status: 'add' };

// 定義資料類型
interface DataItem {
  id: string; // 改為 string 以匹配 GUID
  name: string;
  age: number;
}

// 定義臨時資料類型
interface TempData {
  name: string;
  age: number | string;
}

// 儲存表格資料的響應式變數
const blockData = ref<DataItem[]>([]);

// 定義表格欄位配置
const tableConfig = ref<QTableProps['columns']>([
  {
    label: '姓名',
    name: 'name',
    field: 'name',
    align: 'left',
  },
  {
    label: '年齡',
    name: 'age',
    field: 'age',
    align: 'left',
  },
]);

// 定義表格操作按鈕
const tableButtons = ref<BtnType[]>([
  {
    label: '編輯',
    icon: 'edit',
    status: 'edit',
  },
  {
    label: '刪除',
    icon: 'delete',
    status: 'delete',
  },
]);

// 新增/更新資料時先儲存成臨時變數
const tempData = ref<TempData>({
  name: '',
  age: '',
});

// API路徑
const path = ref('https://dahua.metcfire.com.tw/api/CRUDTest/');

// 刪除確認對話框顯示狀態
const deleteDialog = ref(false);

// 當前要刪除的資料項目，初始為 null
const itemToDelete = ref<DataItem | null>(null);

// 編輯狀態及當前編輯的資料ID
const isEditing = ref(false);
const currentEditId = ref<string | null>(null);

// 畫面掛載完成時，呼叫 API 獲取初始資料
onMounted(async () => {
  await reloadData();
});

// 用按鈕傳入的類型來判斷增刪改
async function handleClickOption(btn: ButtonAction, data: DataItem | TempData) {
  if (btn.status === 'add') {
    // 新增資料邏輯
    await handleAdd();
  } else {
    switch (btn.status) {
      case 'edit':
        if (!('id' in data)) {
          $q.notify({
            type: 'negative',
            message: '找不到資料 無法編輯',
            timeout: 5000,
          });
          return;
        }

        // 將資料複製到 tempData
        tempData.value = {
          name: (data as DataItem).name,
          age: (data as DataItem).age,
        };
        currentEditId.value = (data as DataItem).id;
        isEditing.value = true;
        break;

      case 'delete':
        // 打開刪除確認對話框
        if (!('id' in data)) {
          $q.notify({
            type: 'negative',
            message: '找不到此筆資料的 ID，無法刪除',
            timeout: 5000,
          });
          return;
        }

        // 設定要刪除的項目
        itemToDelete.value = data as DataItem;
        // 打開確認彈窗
        deleteDialog.value = true;
        break;

      default:
        console.warn('未知的操作');
    }
  }
}

// 新增資料
async function handleAdd() {
  // 資料驗證
  if (
    typeof tempData.value.name !== 'string' ||
    (typeof tempData.value.age !== 'string' && typeof tempData.value.age !== 'number')
  ) {
    $q.notify({
      type: 'negative',
      message: '請填寫完整資料',
      timeout: 5000,
    });
    return;
  }

  if (!tempData.value.name.trim() || !tempData.value.age || Number(tempData.value.age) <= 0) {
    $q.notify({
      type: 'negative',
      message: '請填寫正確的姓名與年齡',
      timeout: 5000,
    });
    return;
  }

  try {
    // POST 新增資料
    const response = await axios.post<DataItem>(`${path.value}`, {
      name: tempData.value.name.trim(),
      age: Number(tempData.value.age),
    });
    await reloadData();
    // 清空欄位
    tempData.value.name = '';
    tempData.value.age = '';

    // 顯示成功通知
    $q.notify({
      type: 'positive',
      message: '新增成功',
      timeout: 3000,
    });
  } catch (error) {
    console.error('新增失敗:', error);
    $q.notify({
      type: 'negative',
      message: '新增失敗，請稍後再試',
      timeout: 5000,
    });
  }
}

// 更新資料
async function handleUpdate() {
  if (!currentEditId.value) {
    $q.notify({
      timeout: 5000,
      type: 'negative',
      message: '沒有要編輯的資料',
    });
    return;
  }

  const { name, age } = tempData.value;

  // 驗證資料
  if (!name.trim() || !age || Number(age) <= 0) {
    $q.notify({
      timeout: 5000,
      type: 'negative',
      message: '請填寫正確的姓名與年齡',
    });
    return;
  }

  try {
    // 發送 PATCH 請求，更新資料
    const response = await axios.patch<DataItem>(`${path.value}`, {
      id: currentEditId.value,
      name: name.trim(),
      age: Number(age),
    });

    if (response.data) {
      // 更新畫面資料
      await reloadData();
    } 
    // 清空編輯狀態與input欄位
    isEditing.value = false;
    currentEditId.value = null;
    tempData.value.name = '';
    tempData.value.age = '';

    // 顯示成功通知
    $q.notify({
      timeout: 5000,
      type: 'positive',
      message: '編輯成功',
    });
  } catch (error) {
    console.error('編輯失敗:', error);
    $q.notify({
      timeout: 5000,
      type: 'negative',
      message: '資料編輯失敗，請稍後再試',
    });
  }
}

// 取消編輯
function cancelEdit() {
  isEditing.value = false;
  currentEditId.value = null;
  tempData.value.name = '';
  tempData.value.age = '';
}

// 確認刪除
async function confirmDelete() {
  if (!itemToDelete.value) {
    $q.notify({
      type: 'negative',
      message: '沒有要刪除的資料',
      timeout: 5000,
    });
    return;
  }

  try {
    // 發送 DELETE 請求，刪除指定 ID 的資料
    await axios.delete(`${path.value}${itemToDelete.value.id}`);
    // 從表格資料中移除該資料
    blockData.value = blockData.value.filter((item) => item.id !== itemToDelete.value!.id);

    // 顯示成功通知
    $q.notify({
      type: 'positive',
      message: '刪除成功',
      timeout: 3000,
    });
  } catch (error) {
    console.error('刪除失敗:', error);
    $q.notify({
      type: 'negative',
      message: '刪除失敗，請稍後再試',
      timeout: 5000,
    });
  } finally {
    // 關閉刪除確認對話框
    closeDeleteDialog();
  }
}

// 取消刪除
function cancelDelete() {
  closeDeleteDialog();
}

// 關閉刪除確認對話框，清空要刪除的項目
function closeDeleteDialog() {
  deleteDialog.value = false;
  itemToDelete.value = null;
}

// 重新載入資料的函數
async function reloadData() {
  try {
    // 發送 GET 請求，重新獲取資料
    const response = await axios.get<DataItem[]>(`${path.value}a`);
    blockData.value = response.data;
    console.log('資料重新載入成功');
  } catch (error) {
    console.error('重新載入資料失敗:', error);
    $q.notify({
      timeout: 5000,
      type: 'negative',
      message: '重新載入資料失敗',
    });
  }
}
</script>

<style lang="scss" scoped>
.q-table th {
  font-size: 20px;
  font-weight: bold;
}

.q-table tbody td {
  font-size: 18px;
}

.delete-dialog{
  width: 500px;
  padding: 20px;
}

.mode-title{
  font-size: 24px;
  color: red;
  font-weight: 800;
}

.edit-mode{
  border: 2px solid green;
  border-radius: 5px;
}
</style>
