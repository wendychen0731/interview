<template>
  <q-page class="flex flex-center">
    <q-card style="width: 600px;">
      <q-card-section>
        <div class="text-h6">CRUD 操作</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="isEditing ? updateItem() : createItem()">
          <q-input v-model="formData.name" label="姓名" :rules="[val => !!val || '姓名不得空白']" />
          <q-input v-model="formData.age" label="年齡" type="number" :rules="[val => !!val || '年齡不得空白', val => val > 0 || '年齡必須為正整數']" />
          <q-btn type="submit" :label="isEditing ? '更新' : '新增'" color="primary" class="q-mt-md" />
        </q-form>
      </q-card-section>

      <q-separator />

      <q-table :rows="items" :columns="columns" row-key="id" class="q-mt-md">
        <template v-slot:body-cell-action="props">
          <q-td align="center">
            <q-btn flat round icon="edit" @click="editItem(props.row)" />
            <q-btn flat round icon="delete" color="negative" @click="confirmDelete(props.row.id)" />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { Dialog } from 'quasar';

export default {
  name: 'IndexPage',
  setup() {
    const items = ref([]);
    const formData = ref({
      id: null,
      name: '',
      age: null,
    });
    const isEditing = ref(false);

    const fetchItems = async () => {
      try {
        console.log('Fetching items...');
        const response = await axios.get('https://dahua.metcfire.com.tw/api/CRUDTest/a');
        items.value = response.data;
        console.log('Fetched items:', items.value);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    const createItem = () => {
      console.log('Create item called');
      console.log('Form data:', formData.value);

      if (!formData.value.name || !formData.value.age) {
        alert('請填寫所有欄位');
        return;
      }

      try {
        const payload = {
          name: formData.value.name,
          age: formData.value.age,
        };

        console.log('Payload to be sent:', payload);

        const response = axios.post('https://dahua.metcfire.com.tw/api/CRUDTest', payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Response:', response);

        if (response.data && response.data.id) {
          items.value.push(response.data);
          resetForm(); 
          console.log('Item created:', response.data);
        } else {
          console.error('Invalid response data:', response.data);
        }
      } catch (error) {
        console.error('Error creating item:', error.response ? error.response.data : error);
      }
    };

    const editItem = (item) => {
      console.log('Edit item called:', item);
      formData.value = { ...item };
      isEditing.value = true;
    };

    const updateItem = () => {
      console.log('Update item called');
      if (!formData.value.id) {
        alert('請選擇一個項目來更新');
        return;
      }

      try {
        const payload = {
          id: formData.value.id,
          name: formData.value.name,
          age: formData.value.age,
        };

        console.log('Payload to be sent:', payload);

        const response = axios.patch(`https://dahua.metcfire.com.tw/api/CRUDTest/${formData.value.id}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Response:', response);

        if (response.data && response.data.id) {
          const index = items.value.findIndex(item => item.id === formData.value.id);
          if (index !== -1) {
            items.value[index] = response.data;
          }
          resetForm(); 
          console.log('Item updated:', response.data);
        } else {
          console.error('Invalid response data:', response.data);
        }
      } catch (error) {
        console.error('Error updating item:', error.response ? error.response.data : error);
      }
    };

    const confirmDelete = (id) => {
      console.log('Confirm delete called for id:', id);
      Dialog.create({
        title: '確認刪除',
        message: '確定要刪除這個項目嗎？',
        cancel: true,
        persistent: true,
      }).onOk(() => deleteItem(id));
    };

    const deleteItem = (id) => {
      console.log('Delete item called for id:', id);
      try {
        const response = axios.delete(`https://dahua.metcfire.com.tw/api/CRUDTest/${id}`);
        console.log('Response:', response);

        if (response.status === 200) {
          items.value = items.value.filter(item => item.id !== id);
          console.log('Item deleted with id:', id);
        } else {
          console.error('Error deleting item:', response.data);
        }
      } catch (error) {
        console.error('Error deleting item:', error.response ? error.response.data : error);
      }
    };

    const resetForm = () => {
      formData.value = {
        id: null,
        name: '',
        age: null,
      };
      isEditing.value = false;
      console.log('Form reset');
    };

    onMounted(fetchItems);

    const columns = [
      { name: 'name', required: true, label: '姓名', align: 'left', field: 'name' },
      { name: 'age', align: 'left', label: '年齡', field: 'age' },
      { name: 'action', align: 'center', label: '操作', field: 'action' },
    ];

    return {
      items,
      formData,
      isEditing,
      createItem,
      editItem,
      updateItem,
      deleteItem,
      confirmDelete,
      columns,
    };
  }
};
</script>

<style scoped>
.q-page {
  max-width: 800px;
  margin: auto;
}
.q-mt-md {
  margin-top: 16px;
}
</style>
